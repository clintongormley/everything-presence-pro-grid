// Identify which Everything Presence board is on the wire from what its stock
// (or EPP Grid) firmware reports over Improv Serial.
//
// A USB flash targets a device that may still be running stock firmware, so we
// cannot ask Home Assistant what it is. But EverythingSmart's firmware is
// ESPHome-based and answers Improv `GET_DEVICE_INFO`, whose first field is the
// ESPHome project name — `EverythingSmartTechnology.Everything Presence Lite`
// (or `…Pro`). That is enough to pick the right firmware for the Lite without
// the user choosing a model by hand.

import {
	buildGetInfoCommand,
	drainSerial,
	type ImprovPacket,
	readImprovResponse,
	releaseReader,
	sendImprovPacket,
	TYPE_RPC_RESULT,
} from "./improv-serial.js";

export type DeviceModel = "pro" | "lite";

/** Map a firmware/project name to a board model, or null when it names neither.
 *  Matches on the model words so an unrelated string never resolves to a
 *  model. */
export function parseDeviceModel(firmwareName: string): DeviceModel | null {
	const s = firmwareName.toLowerCase();
	if (s.includes("presence lite")) return "lite";
	if (s.includes("presence pro")) return "pro";
	return null;
}

/** Decode the length-prefixed strings from a GET_DEVICE_INFO RPC_RESULT
 *  payload. Layout: [cmd, total_len, (str_len, ...str_bytes)...]. */
export function parseDeviceInfoStrings(data: Uint8Array): string[] {
	const out: string[] = [];
	const dec = new TextDecoder();
	let i = 2; // skip cmd + total_len
	while (i < data.length) {
		const len = data[i];
		i += 1;
		if (len === 0 || i + len > data.length) break;
		out.push(dec.decode(data.slice(i, i + len)));
		i += len;
	}
	return out;
}

/** Model reported by a GET_DEVICE_INFO RPC_RESULT payload (first string is the
 *  project name), or null when it identifies neither board. */
export function deviceModelFromInfoData(data: Uint8Array): DeviceModel | null {
	const [firmwareName] = parseDeviceInfoStrings(data);
	return firmwareName ? parseDeviceModel(firmwareName) : null;
}

/** Ask the firmware for its device info over an already-open Improv reader /
 *  writer and return the reported strings, or null if it doesn't answer within
 *  `timeoutMs` (a blank/erased board never will — callers fall back to a manual
 *  model choice). */
export async function probeDeviceInfo(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	writer: WritableStreamDefaultWriter<Uint8Array>,
	timeoutMs = 4000,
	signal?: AbortSignal,
): Promise<string[] | null> {
	const deadline = Date.now() + timeoutMs;
	const buffer: number[] = [];
	if (signal?.aborted) return null;
	try {
		await sendImprovPacket(writer, buildGetInfoCommand());
	} catch {}
	// Each read is capped at 600ms, so an abort mid-probe is honoured within that
	// (not instantly) — enough to let a cancel close the port without waiting out
	// the whole budget.
	while (Date.now() < deadline && !signal?.aborted) {
		let res: { packets: ImprovPacket[]; buffer: number[] };
		try {
			res = await readImprovResponse(
				reader,
				Math.min(600, deadline - Date.now()),
				buffer,
			);
		} catch {
			continue;
		}
		for (const pkt of res.packets) {
			if (pkt.type === TYPE_RPC_RESULT) {
				const strings = parseDeviceInfoStrings(pkt.data);
				if (strings.length > 0) return strings;
			}
		}
		if (signal?.aborted) break;
		// Re-poke in case the first command arrived mid-boot.
		try {
			await sendImprovPacket(writer, buildGetInfoCommand());
		} catch {}
	}
	return null;
}

/** Open the serial port (if not already open), ask the running firmware which
 *  board it is, and hand the port back CLOSED (only if we opened it) so esptool
 *  can reopen it to flash. Returns null when the device doesn't identify itself
 *  — a blank board, or one whose firmware doesn't speak Improv — so the caller
 *  falls back to a manual model choice. Never throws for a probe failure — a
 *  port left locked/half-open by an aborted earlier probe degrades to null
 *  rather than surfacing an error. Pass `signal` to cut the probe short (e.g.
 *  the user cancelled the flash). */
export async function readDeviceModel(
	port: SerialPort,
	timeoutMs = 4000,
	signal?: AbortSignal,
): Promise<DeviceModel | null> {
	const openedHere = !port.readable;
	try {
		if (openedHere) await port.open({ baudRate: 115200 });
	} catch {
		return null;
	}
	let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
	let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
	try {
		// Clear whatever the running firmware is already streaming before we ask.
		// getReader/getWriter can throw if the port is still locked by an aborted
		// earlier probe — that (and any probe failure) must return null, not throw.
		const drainReader = port.readable!.getReader();
		await drainSerial(drainReader, 300);
		releaseReader(drainReader);

		writer = port.writable!.getWriter();
		reader = port.readable!.getReader();
		const strings = await probeDeviceInfo(reader, writer, timeoutMs, signal);
		return strings ? parseDeviceModel(strings[0] ?? "") : null;
	} catch {
		return null;
	} finally {
		try {
			writer?.releaseLock();
		} catch {}
		if (reader) releaseReader(reader);
		if (openedHere) {
			try {
				await port.close();
			} catch {}
		}
	}
}
