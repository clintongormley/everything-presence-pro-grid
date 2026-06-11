import { ESPLoader, Transport } from "esptool-js";
import {
	buildGetInfoCommand,
	buildGetStateCommand,
	buildScanCommand,
	buildWifiCommand,
	CMD_GET_CURRENT_STATE,
	CMD_WIFI_SETTINGS,
	drainSerial,
	parseScanResults,
	readImprovResponse,
	releaseReader,
	STATE_PROVISIONED,
	sendImprovPacket,
	TYPE_CURRENT_STATE,
	TYPE_ERROR_STATE,
	TYPE_RPC_RESULT,
	type WifiNetwork,
} from "./improv-serial.js";

const MAC_PATTERN = /MAC:\s*([0-9A-Fa-f:]{17})/;

/**
 * Flashes firmware to a device via USB serial using esptool.js.
 * After completion, the transport is disconnected and the port can be re-opened for Improv.
 */
export async function flashFirmware(
	port: SerialPort,
	variant: string,
	onProgress: (percent: number) => void,
	options?: {
		onMac?: (mac: string) => void;
		beforeFlash?: (mac: string | undefined) => Promise<void>;
		baseUrl?: string;
		accessToken?: string;
	},
): Promise<void> {
	// The firmware proxy is now auth-required, so panel fetches must carry
	// the HA bearer token. Same-origin cookies aren't reliable across HA
	// reverse-proxy setups; an explicit Authorization header is.
	const fetchInit: RequestInit | undefined = options?.accessToken
		? { headers: { Authorization: `Bearer ${options.accessToken}` } }
		: undefined;
	// Prevent Transport.disconnect() from closing the port — reopening a
	// CH340 serial port after Transport closes it leaves the port in a
	// zombie state (opens but no data flows). Instead, we let Transport
	// release its reader lock via disconnect(), but block the port.close()
	// call. We close the port ourselves later when we're done with it.
	const originalClose = port.close.bind(port);
	port.close = async () => {};
	const transport = new Transport(port);
	try {
		let detectedMac: string | undefined;
		const terminal = {
			clean: () => {},
			writeLine: (data: string) => {
				const match = MAC_PATTERN.exec(data);
				if (match) {
					detectedMac = match[1].toUpperCase();
					options?.onMac?.(detectedMac);
				}
			},
			write: (_data: string) => {},
		};
		const loader = new ESPLoader({
			transport,
			baudrate: 115200,
			terminal,
		});

		await loader.main("default_reset");

		if (options?.beforeFlash) {
			await options.beforeFlash(detectedMac);
		}

		// Fetch manifest
		if (!options?.baseUrl) {
			throw Object.assign(
				new Error("baseUrl is required for firmware download"),
				{
					errorKey: "usb.errors.base_url_required",
				},
			);
		}
		const base = options.baseUrl;
		const manifestUrl = `${base}/everything-presence-pro-${variant}-manifest.json`;
		const manifestResp = await fetch(manifestUrl, fetchInit);
		if (!manifestResp.ok) {
			throw Object.assign(new Error("Failed to download firmware manifest"), {
				errorKey: "usb.errors.manifest_download_failed",
			});
		}
		const manifest = await manifestResp.json();

		// Download firmware binaries
		const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);
		const parts = manifest.builds[0].parts as {
			path: string;
			offset: number;
		}[];

		const fileArray: { data: Uint8Array; address: number }[] = [];
		for (const part of parts) {
			const resp = await fetch(`${baseUrl}${part.path}`, fetchInit);
			if (!resp.ok) {
				throw Object.assign(
					new Error(`Failed to download firmware file: ${part.path}`),
					{
						errorKey: "usb.errors.file_download_failed",
						errorParams: { file: part.path },
					},
				);
			}
			const data = new Uint8Array(await resp.arrayBuffer());
			fileArray.push({ data, address: part.offset });
		}

		// Clear the otadata partition (0x9000, size 0x2000) by writing 0xFF.
		// Without this the bootloader keeps booting whichever ota_X partition
		// the previous OTA wrote to — even after we just wrote firmware.bin
		// to ota_0. Erasing otadata lets the bootloader fall back to ota_0,
		// which has the firmware we just installed.
		const otaErase = new Uint8Array(0x2000);
		otaErase.fill(0xff);
		fileArray.push({ data: otaErase, address: 0x9000 });

		// Flash. esptool's reportProgress is PER FILE (written/total restart
		// for every part), so a naive written/total would jump backward at
		// each part boundary — including the otadata blob appended above.
		// Scale each file's fraction by its share of the total byte count
		// for a monotonic overall percentage. (written/total may be measured
		// in compressed bytes; the 0..1 fraction is what matters.)
		const totalBytes = fileArray.reduce((sum, f) => sum + f.data.length, 0);
		const bytesBeforeFile: number[] = [];
		{
			let acc = 0;
			for (const f of fileArray) {
				bytesBeforeFile.push(acc);
				acc += f.data.length;
			}
		}
		await loader.writeFlash({
			fileArray,
			flashSize: "keep",
			flashMode: "keep",
			flashFreq: "keep",
			eraseAll: false,
			compress: true,
			reportProgress: (fileIndex: number, written: number, total: number) => {
				const fraction = total > 0 ? written / total : 1;
				const overall =
					(bytesBeforeFile[fileIndex] +
						fraction * fileArray[fileIndex].data.length) /
					totalBytes;
				onProgress(Math.round(overall * 100));
			},
		});

		// Reset device
		await loader.after("hard_reset");
	} finally {
		try {
			await transport.disconnect();
		} finally {
			// Restore the real close method — even when disconnect() throws,
			// or port.close stays a no-op stub forever and the CH340 port
			// zombies until a page reload.
			port.close = originalClose;
		}
	}
}

/**
 * Opens the port, hard-resets the device, drains stale output, and completes
 * an Improv GET_CURRENT_STATE handshake with retry. Returns a live writer
 * suitable for subsequent Improv commands. Caller is responsible for reading
 * the handshake response on its own reader.
 *
 * Throws `no_device_response` if the handshake fails after MAX_HANDSHAKE_ATTEMPTS.
 */
async function _connectImprov(
	port: SerialPort,
	timings?: {
		drainDelay?: number;
		handshakeDelay?: number;
		handshakeRetryDelay?: number;
	},
): Promise<WritableStreamDefaultWriter<Uint8Array>> {
	if (!port.readable) {
		try {
			await port.open({ baudRate: 115200 });
		} catch {
			throw Object.assign(
				new Error(
					"Could not open serial port. Unplug the device, plug it back in, and try again.",
				),
				{ errorKey: "usb.errors.port_open_failed" },
			);
		}
	}

	// Hard-reset the device via RTS toggle. Explicitly set DTR=false —
	// esptool's Transport leaves DTR in an undefined state which can
	// prevent CH340 USB-serial chips from forwarding received data.
	try {
		await port.setSignals({ dataTerminalReady: false, requestToSend: true });
		await new Promise((r) => setTimeout(r, 200));
		await port.setSignals({ dataTerminalReady: false, requestToSend: false });
	} catch {
		// Some boards don't support serial signal control — continue without reset
	}

	const drainMs = timings?.drainDelay ?? 200;
	const drainReader = port.readable!.getReader();
	await drainSerial(drainReader, drainMs);
	releaseReader(drainReader);

	const writer = port.writable!.getWriter();

	const MAX_HANDSHAKE_ATTEMPTS = 5;
	const handshakeRetryDelay = timings?.handshakeRetryDelay ?? 2000;
	const handshakeTimeout = timings?.handshakeDelay ?? 3000;
	let handshakeOk = false;

	for (let attempt = 0; attempt < MAX_HANDSHAKE_ATTEMPTS; attempt++) {
		if (attempt > 0) {
			await new Promise((r) => setTimeout(r, handshakeRetryDelay));
		}
		try {
			await sendImprovPacket(writer, buildGetStateCommand());
			const handshakeReader = port.readable!.getReader();
			try {
				await readImprovResponse(handshakeReader, handshakeTimeout);
				handshakeOk = true;
			} finally {
				releaseReader(handshakeReader);
			}
		} catch {
			// Not ready yet — retry
		}
		if (handshakeOk) break;
	}

	if (!handshakeOk) {
		writer.releaseLock();
		throw Object.assign(
			new Error(
				"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",
			),
			{ errorKey: "usb.errors.no_device_response" },
		);
	}

	return writer;
}

/**
 * Opens the serial port for Improv communication and runs a WiFi scan.
 * Returns the list of discovered networks.
 */
export async function runWifiScan(
	port: SerialPort,
	timings?: {
		retryDelay?: number;
		drainDelay?: number;
		handshakeDelay?: number;
		handshakeRetryDelay?: number;
	},
): Promise<{
	writer: WritableStreamDefaultWriter<Uint8Array>;
	reader: ReadableStreamDefaultReader<Uint8Array>;
	networks: WifiNetwork[];
}> {
	const writer = await _connectImprov(port, timings);

	// Anything past this point can throw with the writer lock held — e.g.
	// `port.readable!.getReader()` raises a TypeError when the device is
	// unplugged mid-scan (readable becomes null). Release the writer on
	// the way out so the port isn't left with an orphaned lock.
	try {
		const infoCmd = buildGetInfoCommand();
		await sendImprovPacket(writer, infoCmd);
		await new Promise((r) => setTimeout(r, 500));

		// ESPHome's improv_serial returns CACHED WiFi scan results — it doesn't
		// trigger a new scan. If the WiFi component hasn't completed a background
		// scan yet (common right after boot), the first attempt returns empty.
		// Retry up to 3 times with a delay to allow the scan to complete.
		for (let attempt = 0; attempt < 3; attempt++) {
			if (attempt > 0) {
				await new Promise((r) => setTimeout(r, timings?.retryDelay ?? 3000));
			}

			// Send scan command
			const scanCmd = buildScanCommand();
			await sendImprovPacket(writer, scanCmd);

			// Get reader for scan results
			const reader = port.readable!.getReader();

			// Collect scan results (multiple RPC_RESULT packets, terminated by empty data)
			// Pass a persistent buffer through readImprovResponse calls so packets
			// split across serial reads are not lost.
			const networks: WifiNetwork[] = [];
			const deadline = Date.now() + 5000;
			const buffer: number[] = [];
			let scanComplete = false;

			while (Date.now() < deadline && !scanComplete) {
				try {
					const result = await readImprovResponse(
						reader,
						deadline - Date.now(),
						buffer,
					);
					for (const pkt of result.packets) {
						if (pkt.type === TYPE_RPC_RESULT && pkt.data[0] === 0x04) {
							// RPC result format: [command(1), data_length(1), ...strings, checksum(1)]
							// Skip command + data_length to get the string data
							const resultData = pkt.data.slice(2, 2 + pkt.data[1]);
							const network = parseScanResults(resultData);
							if (network === null) {
								// Empty data = scan complete
								scanComplete = true;
								if (networks.length > 0) {
									return { writer, reader, networks };
								}
								break;
							}
							networks.push(network);
						}
					}
				} catch {
					// Timeout — break inner loop
					break;
				}
			}

			if (networks.length > 0) {
				return { writer, reader, networks };
			}

			// No results — release reader and retry. Use the helper so the
			// in-flight read entry tracked in improv-serial's WeakMap is cleaned
			// up too (release/re-acquire loops would otherwise grow it).
			releaseReader(reader);
		}

		// All attempts exhausted — return empty with a fresh reader
		const reader = port.readable!.getReader();
		return { writer, reader, networks: [] };
	} catch (err) {
		try {
			writer.releaseLock();
		} catch {}
		throw err;
	}
}

/**
 * After flashing, queries the device's Improv state to detect whether it is
 * already provisioned with a working WiFi connection. If yes, the caller can
 * skip the WiFi scan + provision flow entirely.
 *
 * Returns the parsed state + IP plus a live writer/reader the caller can use
 * for subsequent operations (e.g. `detectIpAddress` for the skip path).
 * `ip` is set only when the device is PROVISIONED and a real (non-0.0.0.0)
 * address was detected within the budget; otherwise it is `undefined` —
 * there is no sentinel string, callers just check truthiness. On any failure
 * — handshake timeout, malformed packet, port error — throws so the caller
 * can fall through to the existing WiFi scan flow.
 */
export async function queryImprovState(
	port: SerialPort,
	timings?: {
		drainDelay?: number;
		handshakeDelay?: number;
		handshakeRetryDelay?: number;
		readDelay?: number;
	},
	options?: {
		/** Aborting this signal makes the polling loop exit on its next
		 *  iteration (within a few hundred ms) and release the serial
		 *  locks, so a new flash attempt isn't blocked waiting for the
		 *  read budget to elapse naturally. */
		signal?: AbortSignal;
	},
): Promise<{
	state: "AUTHORIZED" | "PROVISIONED";
	ip?: string;
	writer: WritableStreamDefaultWriter<Uint8Array>;
	reader: ReadableStreamDefaultReader<Uint8Array>;
}> {
	const writer = await _connectImprov(port, timings);
	const reader = port.readable!.getReader();
	const signal = options?.signal;

	try {
		// Handshake already sent a GET_CURRENT_STATE; the device should respond with
		// a TYPE_CURRENT_STATE packet and (if provisioned) a TYPE_RPC_RESULT with
		// the URL. Send a fresh GET_CURRENT_STATE here to guarantee an up-to-date
		// response on this reader (the handshake read its response on a scratch
		// reader that was released).
		console.debug(`[queryImprovState] sending GET_CURRENT_STATE`);
		await sendImprovPacket(writer, buildGetStateCommand());

		const readBudget = timings?.readDelay ?? 3000;
		const start = Date.now();
		const buffer: number[] = [];
		let stateByte: number | undefined;

		// Read just enough to know the state byte. The state arrives quickly
		// (Improv responds as soon as ESPHome's setup() runs). URL discovery
		// is deferred to detectIpAddress below.
		const stateDeadline = start + Math.min(readBudget, 3000);
		while (
			Date.now() < stateDeadline &&
			stateByte === undefined &&
			!signal?.aborted
		) {
			const remaining = stateDeadline - Date.now();
			if (remaining <= 0) break;
			try {
				// Cap each read at 500ms so we check `signal.aborted` frequently.
				const result = await readImprovResponse(
					reader,
					Math.min(remaining, 500),
					buffer,
				);
				for (const pkt of result.packets) {
					if (pkt.type === TYPE_CURRENT_STATE && pkt.data.length >= 1) {
						stateByte = pkt.data[0];
					}
				}
			} catch {
				// Timeout or read error — loop and recheck deadline/signal.
			}
		}

		if (signal?.aborted) {
			throw Object.assign(new Error("aborted"), {
				errorKey: "flasher.errors.aborted",
			});
		}

		if (stateByte === undefined) {
			throw Object.assign(new Error("No Improv state received"), {
				errorKey: "usb.errors.no_device_response",
			});
		}

		// For PROVISIONED devices, delegate IP-polling to detectIpAddress —
		// the same code used post-provisioning. Handles 0.0.0.0 transient
		// responses by polling GET_CURRENT_STATE every POLL_INTERVAL_MS
		// until a real IP arrives or the budget is exhausted.
		let ip: string | undefined;
		if (stateByte === STATE_PROVISIONED) {
			const remainingBudget = Math.max(0, start + readBudget - Date.now());
			if (remainingBudget > 0) {
				console.debug(
					`[queryImprovState] PROVISIONED — delegating to detectIpAddress (budget=${remainingBudget}ms)`,
				);
				try {
					ip = await detectIpAddress(reader, writer, remainingBudget, {
						initialBuffer: buffer,
						startPolling: true,
						signal,
					});
				} catch (err) {
					// No usable IP within budget — leave ip undefined per the
					// contract above (callers fall through to the scan flow).
					console.debug(
						`[queryImprovState] detectIpAddress gave up: ${(err as Error).message}`,
					);
				}
			}
		}

		console.debug(
			`[queryImprovState] exit: elapsed=${Date.now() - start}ms, stateByte=${stateByte}, ip=${ip}`,
		);

		const state: "AUTHORIZED" | "PROVISIONED" =
			stateByte === STATE_PROVISIONED ? "PROVISIONED" : "AUTHORIZED";

		return { state, ip, writer, reader };
	} catch (err) {
		try {
			writer.releaseLock();
		} catch {}
		releaseReader(reader);
		throw err;
	}
}

/**
 * Sends WiFi credentials via Improv Serial.
 */
export async function runWifiProvision(
	writer: WritableStreamDefaultWriter<Uint8Array>,
	ssid: string,
	password: string,
): Promise<void> {
	await sendImprovPacket(writer, buildWifiCommand(ssid, password));
}

const POLL_INTERVAL_MS = 1000;

/**
 * After `WIFI_SETTINGS` has been sent on `writer`, reads Improv Serial packets
 * from `reader` to determine the IP the device received.
 *
 * ESPHome's improv_serial reports `http://0.0.0.0` while DHCP is still in
 * progress and does not push an update once DHCP completes — so if we see
 * `0.0.0.0` in the `WIFI_SETTINGS` response, we poll `GET_CURRENT_STATE`
 * every {@link POLL_INTERVAL_MS} ms until either a real IP appears or the
 * total `timeoutMs` budget is exhausted.
 *
 * - Returns the IPv4 address string (e.g. `"192.168.1.42"`) on success.
 * - Throws an `Error` with `errorKey` on failure: `wifi.errors.connection_failed`
 *   (budget exhausted with persistent `0.0.0.0`, or `ERROR_STATE` with
 *   `UNABLE_TO_CONNECT` code), `wifi.errors.invalid_command`,
 *   `wifi.errors.unknown_command`, `wifi.errors.not_authorized`, or
 *   `wifi.errors.error_code` (with `errorParams.code`) for other ERROR_STATE
 *   codes.
 */
export async function detectIpAddress(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	writer: WritableStreamDefaultWriter<Uint8Array>,
	timeoutMs: number,
	options?: {
		initialBuffer?: number[];
		startPolling?: boolean;
		/** Aborting this signal exits the polling loop on its next iteration. */
		signal?: AbortSignal;
	},
): Promise<string> {
	const decoder = new TextDecoder();
	const ipPattern = /(\d+\.\d+\.\d+\.\d+)/;
	const deadline = Date.now() + timeoutMs;
	const buffer: number[] = options?.initialBuffer ?? [];
	let lastPollAt = 0; // 0 ensures the first poll fires immediately after seeing 0.0.0.0
	// If the caller has already seen a 0.0.0.0 URL (e.g. queryImprovState
	// during the wifi-check phase), start polling straight away rather than
	// blocking on a read that may never come.
	let sawZeroUrl = options?.startPolling ?? false;
	const signal = options?.signal;

	console.debug(
		`[detectIpAddress] enter timeout=${timeoutMs}ms initialBuffer=${buffer.length}B startPolling=${sawZeroUrl}`,
	);

	while (Date.now() < deadline) {
		if (signal?.aborted) {
			console.debug(`[detectIpAddress] aborted via signal`);
			throw Object.assign(new Error("aborted"), {
				errorKey: "flasher.errors.aborted",
			});
		}
		if (sawZeroUrl && Date.now() - lastPollAt >= POLL_INTERVAL_MS) {
			console.debug(`[detectIpAddress] polling GET_CURRENT_STATE`);
			await sendImprovPacket(writer, buildGetStateCommand());
			lastPollAt = Date.now();
		}

		try {
			// Cap each read at POLL_INTERVAL_MS so we check signal.aborted
			// at least that often, even on the "not yet polling" path.
			const readBudget = Math.min(POLL_INTERVAL_MS, deadline - Date.now());
			const result = await readImprovResponse(reader, readBudget, buffer);
			for (const pkt of result.packets) {
				if (pkt.type === TYPE_ERROR_STATE) {
					const code = pkt.data[0];
					const messages: Record<number, string> = {
						1: "Invalid command — device may need to be power-cycled",
						2: "Unknown command",
						3: "WiFi connection failed — check SSID/password and try again",
						4: "Not authorized",
					};
					const errorKeyByCode: Record<number, string> = {
						1: "wifi.errors.invalid_command",
						2: "wifi.errors.unknown_command",
						3: "wifi.errors.connection_failed",
						4: "wifi.errors.not_authorized",
					};
					const key = errorKeyByCode[code] ?? "wifi.errors.error_code";
					console.debug(`[detectIpAddress] ERROR_STATE code=${code} → ${key}`);
					throw Object.assign(
						new Error(messages[code] ?? `WiFi error (code ${code})`),
						{
							errorKey: key,
							errorParams:
								key === "wifi.errors.error_code" ? { code } : undefined,
						},
					);
				}
				if (
					pkt.type === TYPE_RPC_RESULT &&
					pkt.data.length >= 3 &&
					(pkt.data[0] === CMD_WIFI_SETTINGS ||
						pkt.data[0] === CMD_GET_CURRENT_STATE)
				) {
					const urlLen = pkt.data[2];
					if (pkt.data.length < 3 + urlLen) {
						// Malformed or truncated packet — skip to avoid decoding
						// garbage that happens to match the IP regex.
						console.debug(
							`[detectIpAddress] truncated RPC_RESULT cmd=0x${pkt.data[0]?.toString(16)} urlLen=${urlLen} dataLen=${pkt.data.length} — skipped`,
						);
						continue;
					}
					const url = decoder.decode(pkt.data.slice(3, 3 + urlLen));
					const match = ipPattern.exec(url);
					if (match && match[1] !== "0.0.0.0") {
						console.debug(`[detectIpAddress] exit: IP=${match[1]}`);
						return match[1];
					}
					if (match && match[1] === "0.0.0.0") {
						sawZeroUrl = true;
					}
				}
			}
		} catch (err) {
			if (
				err instanceof Error &&
				(err as Error & { errorKey?: string }).errorKey !==
					"flasher.errors.timeout"
			) {
				console.debug(
					`[detectIpAddress] exit: error "${(err as Error).message}"`,
				);
				throw err;
			}
			// timeout from readImprovResponse — loop will check deadline and maybe poll again
		}
	}

	console.debug(`[detectIpAddress] exit: deadline exhausted, no IP received`);
	throw Object.assign(
		new Error("WiFi connection failed — check SSID/password and try again"),
		{ errorKey: "wifi.errors.connection_failed" },
	);
}
