import { describe, expect, it, vi } from "vitest";
import {
	deviceModelFromInfoData,
	parseDeviceInfoStrings,
	parseDeviceModel,
	probeDeviceInfo,
	readDeviceModel,
} from "../../lib/device-model.js";
import {
	buildImprovPacket,
	TYPE_CURRENT_STATE,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";

// The exact GET_DEVICE_INFO RPC_RESULT payload a stock Everything Presence Lite
// returns (captured from a real device over Improv):
//   cmd=0x03, total_len=0x5f, then length-prefixed strings:
//   "EverythingSmartTechnology.Everything Presence Lite", "1.3.0", "ESP32",
//   "everything-presence-lite-af3770", then a trailing 0x00.
function liteInfoPayload(): Uint8Array {
	const enc = new TextEncoder();
	const strings = [
		"EverythingSmartTechnology.Everything Presence Lite",
		"1.3.0",
		"ESP32",
		"everything-presence-lite-af3770",
	];
	const body: number[] = [];
	for (const s of strings) {
		const bytes = enc.encode(s);
		body.push(bytes.length, ...bytes);
	}
	// [cmd, total_len, ...length-prefixed strings, trailing 0x00]
	return new Uint8Array([0x03, body.length, ...body, 0x00]);
}

function proInfoPayload(): Uint8Array {
	const enc = new TextEncoder();
	const bytes = enc.encode("EverythingSmartTechnology.Everything Presence Pro");
	return new Uint8Array([0x03, bytes.length + 1, bytes.length, ...bytes]);
}

function mockWriter(): WritableStreamDefaultWriter<Uint8Array> {
	return {
		write: vi.fn().mockResolvedValue(undefined),
		releaseLock: vi.fn(),
	} as unknown as WritableStreamDefaultWriter<Uint8Array>;
}

function mockReader(
	chunks: Uint8Array[],
): ReadableStreamDefaultReader<Uint8Array> {
	let idx = 0;
	return {
		read: vi.fn().mockImplementation(() => {
			if (idx >= chunks.length) return new Promise(() => {}); // hang (no more data)
			return Promise.resolve({ value: chunks[idx++], done: false });
		}),
		cancel: vi.fn().mockResolvedValue(undefined),
		releaseLock: vi.fn(),
	} as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

describe("parseDeviceModel", () => {
	it("recognises the Lite from its project name", () => {
		expect(
			parseDeviceModel("EverythingSmartTechnology.Everything Presence Lite"),
		).toBe("lite");
	});

	it("recognises the Pro from its project name", () => {
		expect(
			parseDeviceModel("EverythingSmartTechnology.Everything Presence Pro"),
		).toBe("pro");
	});

	it("is case-insensitive", () => {
		expect(parseDeviceModel("everything presence LITE")).toBe("lite");
	});

	it("returns null for an unrelated device name", () => {
		expect(parseDeviceModel("Some Other Device")).toBeNull();
	});

	it("returns null for an empty string", () => {
		expect(parseDeviceModel("")).toBeNull();
	});
});

describe("parseDeviceInfoStrings", () => {
	it("decodes the length-prefixed strings from a real Lite payload", () => {
		expect(parseDeviceInfoStrings(liteInfoPayload())).toEqual([
			"EverythingSmartTechnology.Everything Presence Lite",
			"1.3.0",
			"ESP32",
			"everything-presence-lite-af3770",
		]);
	});

	it("returns an empty array for a payload with no strings", () => {
		expect(parseDeviceInfoStrings(new Uint8Array([0x03, 0x00]))).toEqual([]);
	});
});

describe("deviceModelFromInfoData", () => {
	it("reads the model from the first string of a Lite payload", () => {
		expect(deviceModelFromInfoData(liteInfoPayload())).toBe("lite");
	});

	it("reads the model from the first string of a Pro payload", () => {
		expect(deviceModelFromInfoData(proInfoPayload())).toBe("pro");
	});
});

describe("probeDeviceInfo", () => {
	it("returns the device-info strings when the firmware answers", async () => {
		const reader = mockReader([
			buildImprovPacket(TYPE_RPC_RESULT, Array.from(liteInfoPayload())),
		]);
		const writer = mockWriter();

		const strings = await probeDeviceInfo(reader, writer, 1000);

		expect(strings?.[0]).toBe(
			"EverythingSmartTechnology.Everything Presence Lite",
		);
		// It must have actually asked the device (sent GET_DEVICE_INFO).
		expect(writer.write).toHaveBeenCalled();
	});

	it("returns null when the device never answers with device-info", async () => {
		// A blank/erased device: only noise, never an RPC_RESULT.
		const reader = mockReader([buildImprovPacket(TYPE_CURRENT_STATE, [0x02])]);
		const writer = mockWriter();

		const strings = await probeDeviceInfo(reader, writer, 300);

		expect(strings).toBeNull();
	});
});

// A minimal SerialPort: closed until open(); getReader() hands out the queued
// readers in order (first the drain reader, then the probe reader).
function mockPort(readers: ReadableStreamDefaultReader<Uint8Array>[]): {
	port: SerialPort;
	open: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
} {
	let isOpen = false;
	let ri = 0;
	const readable = { getReader: () => readers[ri++] ?? mockReader([]) };
	const writable = { getWriter: () => mockWriter() };
	const open = vi.fn(async () => {
		isOpen = true;
	});
	const close = vi.fn(async () => {
		isOpen = false;
	});
	const port = {
		get readable() {
			return isOpen ? readable : null;
		},
		get writable() {
			return isOpen ? writable : null;
		},
		open,
		close,
	} as unknown as SerialPort;
	return { port, open, close };
}

describe("readDeviceModel", () => {
	it("opens the port, reads the model, then closes it again", async () => {
		const { port, open, close } = mockPort([
			mockReader([]), // drain reader — no data
			mockReader([
				buildImprovPacket(TYPE_RPC_RESULT, Array.from(liteInfoPayload())),
			]),
		]);

		const model = await readDeviceModel(port, 1000);

		expect(model).toBe("lite");
		expect(open).toHaveBeenCalled();
		// It must hand the port back closed so esptool can reopen it to flash.
		expect(close).toHaveBeenCalled();
	});

	it("returns null (and still closes) for a device that doesn't answer", async () => {
		const { port, close } = mockPort([mockReader([]), mockReader([])]);

		const model = await readDeviceModel(port, 300);

		expect(model).toBeNull();
		expect(close).toHaveBeenCalled();
	});
});

describe("readDeviceModel — resilience (review finding: cancel/retry during detect)", () => {
	it("returns null instead of throwing when the port can't be read", async () => {
		// e.g. an orphaned earlier probe still holds the reader lock, so getReader
		// throws. readDeviceModel documents 'never throws' → must degrade to null
		// (manual-pick fallback), not surface a port_open_failed error.
		let isOpen = true;
		const port = {
			get readable() {
				return isOpen
					? {
							getReader: () => {
								throw new DOMException("locked", "InvalidStateError");
							},
						}
					: null;
			},
			get writable() {
				return isOpen ? { getWriter: () => mockWriter() } : null;
			},
			open: vi.fn(async () => {
				isOpen = true;
			}),
			close: vi.fn(async () => {
				isOpen = false;
			}),
		} as unknown as SerialPort;

		await expect(readDeviceModel(port, 300)).resolves.toBeNull();
	});

	it("bails promptly when the abort signal is already set", async () => {
		// Cancel during the ~4s detect must not make the caller wait out the whole
		// budget. A pre-aborted signal returns fast rather than after 5s.
		const { port } = mockPort([mockReader([]), mockReader([])]);
		const ctrl = new AbortController();
		ctrl.abort();
		const model = await readDeviceModel(port, 5000, ctrl.signal);
		expect(model).toBeNull();
	});
});
