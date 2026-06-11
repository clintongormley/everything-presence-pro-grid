/**
 * Improv Serial protocol implementation for WiFi scanning and provisioning.
 * Spec: https://www.improv-wifi.com/serial/
 */

// Header bytes: ASCII "IMPROV"
export const IMPROV_HEADER = [0x49, 0x4d, 0x50, 0x52, 0x4f, 0x56];

// Largest possible complete packet:
// header(6) + version(1) + type(1) + length(1) + data(<=255) + checksum(1).
const MAX_PACKET_LEN = IMPROV_HEADER.length + 3 + 255 + 1;

// Raw serial console mirroring is opt-in: ESPHome device logs can carry
// SSIDs and URLs, which must not land in the browser console by default.
let _debugLogging = false;

/**
 * Enable/disable mirroring of raw serial log text to console.debug.
 * Developer switch for diagnosing flasher issues — OFF by default.
 * Disabling also drops any partially-buffered line.
 */
export function setImprovDebugLogging(enabled: boolean): void {
	_debugLogging = enabled;
	if (!enabled) _logBuffer = "";
}

// Module-level text buffer used by readImprovResponse's debug logging to
// reassemble serial chunks into complete lines before flushing to console.
// ESPHome's UART emits chunks sized to USB packet boundaries, not newlines.
let _logBuffer = "";

// Single stream-mode decoder shared across chunks: a fresh per-chunk
// decoder would mangle multibyte UTF-8 sequences split across USB packets
// into U+FFFD replacement chars.
const _logDecoder = new TextDecoder("utf-8", { fatal: false });

// Per-reader pending reader.read() promise. readImprovResponse's Promise.race
// against a setTimeout abandons the in-flight read when the timeout wins —
// Web Streams has no way to cancel a read without releasing the reader. The
// abandoned promise still resolves later with a chunk from the stream, and
// that chunk would be dropped on the floor. We stash the pending promise here
// so the next call re-awaits it instead of calling read() again.
const _pendingReads = new WeakMap<
	ReadableStreamDefaultReader<Uint8Array>,
	Promise<ReadableStreamReadResult<Uint8Array>>
>();

/**
 * Release a reader's stream lock and drop any in-flight pending-read entry
 * tracked for it. Use this instead of bare `reader.releaseLock()` whenever
 * a reader has been (or could have been) passed through readImprovResponse:
 * release + re-acquire loops (e.g. runWifiScan) would otherwise leave the
 * WeakMap holding a dead promise tied to the released reader until GC.
 */
export function releaseReader(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): void {
	_pendingReads.delete(reader);
	try {
		reader.releaseLock();
	} catch {
		// Already released or stream cancelled — nothing useful to do.
	}
}

// Built via constructor so the literal control character (0x1b / ESC)
// doesn't trip biome's noControlCharactersInRegex rule. We strip ANSI
// SGR escape sequences from ESPHome log output before printing.
const _ANSI_PATTERN = new RegExp(
	`${String.fromCharCode(0x1b)}\\[[0-9;]*m`,
	"g",
);

export const TYPE_CURRENT_STATE = 0x01;
export const TYPE_ERROR_STATE = 0x02;
export const TYPE_RPC_COMMAND = 0x03;
export const TYPE_RPC_RESULT = 0x04;

export const STATE_AUTHORIZED = 0x02;
export const STATE_PROVISIONED = 0x04;
export const ERROR_UNABLE_TO_CONNECT = 0x03;

export const CMD_WIFI_SETTINGS = 0x01;
export const CMD_GET_CURRENT_STATE = 0x02;
export const CMD_GET_DEVICE_INFO = 0x03;
export const CMD_WIFI_SCAN = 0x04;

export interface WifiNetwork {
	ssid: string;
	rssi: number;
	authRequired: boolean;
}

export interface ImprovPacket {
	type: number;
	data: Uint8Array;
}

/**
 * Builds an Improv Serial packet.
 * Format: [HEADER(6)] [VERSION=0x01(1)] [TYPE(1)] [LENGTH(1)] [DATA(N)] [CHECKSUM(1)]
 * Checksum = sum of all preceding bytes mod 256.
 */
export function buildImprovPacket(type: number, data: number[]): Uint8Array {
	// +1 for trailing newline required by Improv Serial spec
	const totalLength = IMPROV_HEADER.length + 1 + 1 + 1 + data.length + 1 + 1;
	const packet = new Uint8Array(totalLength);

	let offset = 0;
	// Header
	for (const byte of IMPROV_HEADER) {
		packet[offset++] = byte;
	}
	// Version
	packet[offset++] = 0x01;
	// Type
	packet[offset++] = type;
	// Length
	packet[offset++] = data.length;
	// Data
	for (const byte of data) {
		packet[offset++] = byte;
	}
	// Checksum
	let checksum = 0;
	for (let i = 0; i < offset; i++) {
		checksum = (checksum + packet[i]) & 0xff;
	}
	packet[offset++] = checksum;
	// Trailing newline
	packet[offset] = 0x0a;

	return packet;
}

/**
 * Builds a WiFi scan RPC command packet.
 */
export function buildScanCommand(): Uint8Array {
	return buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
}

/**
 * Builds a GET_CURRENT_STATE RPC command packet.
 */
export function buildGetStateCommand(): Uint8Array {
	return buildImprovPacket(TYPE_RPC_COMMAND, [CMD_GET_CURRENT_STATE, 0x00]);
}

/**
 * Builds a GET_DEVICE_INFO RPC command packet.
 */
export function buildGetInfoCommand(): Uint8Array {
	return buildImprovPacket(TYPE_RPC_COMMAND, [CMD_GET_DEVICE_INFO, 0x00]);
}

/**
 * Builds a WiFi provisioning command packet.
 * Data: [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid_bytes, pass_len, ...pass_bytes]
 */
export function buildWifiCommand(ssid: string, password: string): Uint8Array {
	const encoder = new TextEncoder();
	const ssidBytes = encoder.encode(ssid);
	const passBytes = encoder.encode(password);

	// The wire format's length prefixes are single bytes, so oversized
	// values would silently truncate mod 256 and provision garbage. Enforce
	// the protocol limits (802.11: 32-octet SSID; WPA: 64-char passphrase)
	// in UTF-8 BYTES — a char-count check would let multibyte SSIDs through.
	if (ssidBytes.length > 32) {
		throw Object.assign(
			new Error(`SSID is too long: ${ssidBytes.length} bytes (max 32)`),
			{ errorKey: "wifi.errors.ssid_too_long" },
		);
	}
	if (passBytes.length > 64) {
		throw Object.assign(
			new Error(`Password is too long: ${passBytes.length} bytes (max 64)`),
			{ errorKey: "wifi.errors.password_too_long" },
		);
	}

	const totalLen = 1 + ssidBytes.length + 1 + passBytes.length;
	const data: number[] = [
		CMD_WIFI_SETTINGS,
		totalLen,
		ssidBytes.length,
		...ssidBytes,
		passBytes.length,
		...passBytes,
	];

	return buildImprovPacket(TYPE_RPC_COMMAND, data);
}

/**
 * Human-readable description of an Improv packet — used by the console.debug
 * logs in readImprovResponse. Keeps the diagnostic output usable without
 * forcing readers to remember the 0x01/0x04 type codes.
 */
export function describeImprovPacket(p: ImprovPacket): string {
	switch (p.type) {
		case TYPE_CURRENT_STATE: {
			const stateByte = p.data[0];
			const stateName =
				stateByte === STATE_AUTHORIZED
					? "AUTHORIZED"
					: stateByte === STATE_PROVISIONED
						? "PROVISIONED"
						: `state=0x${stateByte?.toString(16).padStart(2, "0")}`;
			return `CURRENT_STATE ${stateName}`;
		}
		case TYPE_ERROR_STATE: {
			const errByte = p.data[0];
			return `ERROR_STATE 0x${errByte?.toString(16).padStart(2, "0")}`;
		}
		case TYPE_RPC_COMMAND: {
			const cmd = p.data[0];
			return `RPC_COMMAND 0x${cmd?.toString(16).padStart(2, "0")}`;
		}
		case TYPE_RPC_RESULT: {
			const cmd = p.data[0];
			const cmdName =
				cmd === CMD_GET_CURRENT_STATE
					? "GET_CURRENT_STATE"
					: cmd === CMD_GET_DEVICE_INFO
						? "GET_DEVICE_INFO"
						: cmd === CMD_WIFI_SCAN
							? "WIFI_SCAN"
							: cmd === CMD_WIFI_SETTINGS
								? "WIFI_SETTINGS"
								: `cmd=0x${cmd?.toString(16).padStart(2, "0")}`;
			// RPC_RESULT data: [cmd, total_len, str_len, ...str_bytes, ...]
			// For GET_CURRENT_STATE and WIFI_SETTINGS the first string is the URL.
			if (
				(cmd === CMD_GET_CURRENT_STATE || cmd === CMD_WIFI_SETTINGS) &&
				p.data.length >= 3
			) {
				const strLen = p.data[2];
				if (p.data.length >= 3 + strLen) {
					const str = new TextDecoder().decode(p.data.slice(3, 3 + strLen));
					return `RPC_RESULT ${cmdName} url="${str}"`;
				}
			}
			return `RPC_RESULT ${cmdName} (${p.data.length} bytes)`;
		}
		default:
			return `type=0x${p.type.toString(16).padStart(2, "0")} (${p.data.length} bytes)`;
	}
}

/**
 * Parses a byte stream for Improv Serial packets.
 * Scans for the IMPROV header, extracts complete packets, and verifies checksums.
 * Returns all valid packets found.
 */
export function parseImprovPackets(data: Uint8Array): {
	packets: ImprovPacket[];
	consumed: number;
} {
	const packets: ImprovPacket[] = [];
	const headerLen = IMPROV_HEADER.length;

	const HEADER_FIRST = IMPROV_HEADER[0];
	let i = data.indexOf(HEADER_FIRST);
	if (i < 0) return { packets, consumed: 0 };
	let consumed = 0;
	while (i >= 0 && i <= data.length - headerLen) {
		// Look for the IMPROV header
		let headerFound = true;
		for (let h = 0; h < headerLen; h++) {
			if (data[i + h] !== IMPROV_HEADER[h]) {
				headerFound = false;
				break;
			}
		}

		if (!headerFound) {
			i = data.indexOf(HEADER_FIRST, i + 1);
			continue;
		}

		// Header found at position i
		// Packet: header(6) + version(1) + type(1) + length(1) + data(length) + checksum(1)
		const baseOffset = i + headerLen;
		// Need at least version(1) + type(1) + length(1) + checksum(1) more bytes
		if (baseOffset + 3 >= data.length) {
			// Not enough bytes for a complete packet header — stop here
			break;
		}

		// version = data[baseOffset]
		const type = data[baseOffset + 1];
		const length = data[baseOffset + 2];
		const packetEnd = baseOffset + 3 + length + 1; // +1 for checksum

		if (packetEnd > data.length) {
			// Incomplete packet — stop here, don't skip past the header
			break;
		}

		// Verify checksum
		let checksum = 0;
		for (let j = i; j < packetEnd - 1; j++) {
			checksum = (checksum + data[j]) & 0xff;
		}

		if (checksum !== data[packetEnd - 1]) {
			// Invalid checksum — skip to next potential header
			i = data.indexOf(HEADER_FIRST, i + 1);
			continue;
		}

		// Valid packet
		const packetData = data.slice(baseOffset + 3, baseOffset + 3 + length);
		packets.push({ type, data: packetData });

		i = packetEnd;
		// Skip optional trailing newline
		if (i < data.length && data[i] === 0x0a) {
			i++;
		}
		consumed = i;
		i = data.indexOf(HEADER_FIRST, i);
	}

	return { packets, consumed };
}

/**
 * Writes an Improv packet to a serial writer.
 */
export async function sendImprovPacket(
	writer: WritableStreamDefaultWriter<Uint8Array>,
	packet: Uint8Array,
): Promise<void> {
	await writer.write(packet);
}

/**
 * Reads from a serial reader until valid Improv packets are found or timeout.
 * Accumulates data across chunks, skips non-Improv bytes (log text). Throws on
 * timeout. Bytes read before a timeout remain available to the caller for the
 * next call via `initialBuffer`, so a packet split across the read budget is
 * not lost.
 */
export async function readImprovResponse(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	timeoutMs: number,
	initialBuffer?: number[],
): Promise<{ packets: ImprovPacket[]; buffer: number[] }> {
	const buffer: number[] = initialBuffer ?? [];
	const deadline = Date.now() + timeoutMs;
	const TIMEOUT = Symbol();

	while (Date.now() < deadline) {
		const remaining = deadline - Date.now();
		if (remaining <= 0) break;

		let pending = _pendingReads.get(reader);
		if (!pending) {
			pending = reader.read();
			_pendingReads.set(reader, pending);
		}

		let timerId: ReturnType<typeof setTimeout> | undefined;
		let raced: ReadableStreamReadResult<Uint8Array> | typeof TIMEOUT;
		try {
			raced = await Promise.race<
				ReadableStreamReadResult<Uint8Array> | typeof TIMEOUT
			>([
				pending,
				new Promise<typeof TIMEOUT>((resolve) => {
					timerId = setTimeout(() => resolve(TIMEOUT), remaining);
				}),
			]);
		} catch (err) {
			// pending rejected (stream error) — clear it so a future caller
			// can try a fresh reader.read() instead of immediately rethrowing
			// the same stale rejection.
			_pendingReads.delete(reader);
			throw err;
		} finally {
			clearTimeout(timerId);
		}

		if (raced === TIMEOUT) {
			// Leave the pending read in the WeakMap — the next call will
			// re-await it and receive the chunk that resolves it.
			break;
		}
		_pendingReads.delete(reader);
		const result = raced;

		if (result.value) {
			if (_debugLogging) {
				// Accumulate decoded text and flush on newline boundaries so
				// ESPHome log lines aren't split across multiple console entries.
				_logBuffer += _logDecoder.decode(result.value, { stream: true });
				const nlIdx = _logBuffer.lastIndexOf("\n");
				if (nlIdx >= 0) {
					const complete = _logBuffer.slice(0, nlIdx);
					_logBuffer = _logBuffer.slice(nlIdx + 1);
					// Strip ANSI SGR sequences at flush time (per complete
					// line) so a sequence split across chunks is still caught.
					for (const line of complete.replace(_ANSI_PATTERN, "").split("\n")) {
						if (line.length > 0) console.debug(line);
					}
				}
			}
			// Append byte-by-byte: spreading a large chunk into push() can
			// exceed the engine's argument-count limit (RangeError).
			for (let i = 0; i < result.value.length; i++) {
				buffer.push(result.value[i]);
			}
			const { packets, consumed } = parseImprovPackets(new Uint8Array(buffer));
			if (packets.length > 0) {
				for (const p of packets) {
					console.debug(`[improv] ${describeImprovPacket(p)}`);
				}
				buffer.splice(0, consumed);
				return { packets, buffer };
			}
			// Nothing parsed — bound the buffer so a minute of verbose device
			// logging can't grow it (and the full rescan above) unboundedly.
			trimParseBuffer(buffer);
		}

		if (result.done) {
			// The stream ended: the device was unplugged or the port closed.
			// Reporting this as "timeout" sends the user down the wrong
			// troubleshooting path (and callers would keep re-reading a dead
			// stream until their budget runs out).
			throw Object.assign(new Error("serial port closed"), {
				errorKey: "flasher.errors.port_closed",
			});
		}
	}

	throw Object.assign(new Error("timeout"), {
		errorKey: "flasher.errors.timeout",
	});
}

/**
 * Trim a parse buffer that yielded no packets down to at most one
 * max-size packet (in place, preserving the caller's array reference).
 *
 * Sound because a complete packet is at most MAX_PACKET_LEN bytes: any
 * still-incomplete packet must start within the last MAX_PACKET_LEN bytes
 * (an earlier start would already have parsed or failed its checksum). We
 * keep everything from the first potential header start in that window —
 * including a partial "IMP…" prefix at the very tail — and drop the rest.
 */
function trimParseBuffer(buffer: number[]): void {
	if (buffer.length <= MAX_PACKET_LEN) return;
	const floor = buffer.length - MAX_PACKET_LEN;
	let keepFrom = buffer.length;
	for (let i = floor; i < buffer.length; i++) {
		if (buffer[i] !== IMPROV_HEADER[0]) continue;
		let prefixOk = true;
		for (let h = 1; h < IMPROV_HEADER.length && i + h < buffer.length; h++) {
			if (buffer[i + h] !== IMPROV_HEADER[h]) {
				prefixOk = false;
				break;
			}
		}
		if (prefixOk) {
			keepFrom = i;
			break;
		}
	}
	buffer.splice(0, keepFrom);
}

/**
 * Reads and discards buffered serial data for the given duration.
 * Used to clear stale data before starting Improv communication.
 */
export async function drainSerial(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	timeoutMs: number,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		const remaining = deadline - Date.now();
		if (remaining <= 0) break;

		await Promise.race([
			reader.read(),
			new Promise<void>((resolve) => setTimeout(resolve, remaining)),
		]);
	}
}

/**
 * Parses a scan result from an RPC result data payload.
 * Format: 3 length-prefixed strings: SSID, RSSI string, auth ("YES"/"NO")
 * Returns null for empty data (termination packet).
 */
export function parseScanResults(data: Uint8Array): WifiNetwork | null {
	if (data.length === 0) {
		return null;
	}

	const decoder = new TextDecoder();
	let offset = 0;

	const readString = (maxBytes = Number.POSITIVE_INFINITY): string | null => {
		if (offset >= data.length) return null;
		const len = data[offset++];
		if (offset + len > data.length) return null;
		// Truncate by *bytes* before decoding so the UTF-8 boundary stays
		// the source of truth (slicing a JS string clamps code units, not
		// bytes — multibyte chars would let the result exceed the limit).
		const readLen = Math.min(len, maxBytes);
		const value = decoder.decode(data.slice(offset, offset + readLen));
		offset += len;
		return value;
	};

	// 802.11 caps SSID at 32 octets; enforce here before decoding so a
	// misbehaving device can't push an unbounded UTF-8 buffer into the UI.
	const ssidRaw = readString(32);
	if (ssidRaw === null) return null;

	const rssiStr = readString();
	if (rssiStr === null) return null;

	const auth = readString();
	if (auth === null) return null;

	const rssi = Number.parseInt(rssiStr, 10);
	if (Number.isNaN(rssi)) return null;

	// Strip ASCII control characters (incl. NUL, BEL, ESC) so a malformed
	// device payload can't inject terminal escapes or zero-width junk into
	// the UI. Byte-length is already capped above by readString(32).
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional for SSID sanitisation
	const ssid = ssidRaw.replace(/[\x00-\x1f\x7f]/g, "");

	return {
		ssid,
		rssi,
		authRequired: auth === "YES",
	};
}
