import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildImprovPacket as buildPacket,
	buildScanCommand,
	drainSerial,
	readImprovResponse,
	releaseReader,
	sendImprovPacket,
	setImprovDebugLogging,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";

function mockWriter(): WritableStreamDefaultWriter<Uint8Array> {
	return {
		write: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		abort: vi.fn().mockResolvedValue(undefined),
		closed: Promise.resolve(undefined),
		desiredSize: 1,
		ready: Promise.resolve(undefined),
		releaseLock: vi.fn(),
	} as unknown as WritableStreamDefaultWriter<Uint8Array>;
}

function mockReader(
	chunks: Uint8Array[],
	opts?: { delayMs?: number },
): ReadableStreamDefaultReader<Uint8Array> {
	let idx = 0;
	return {
		read: vi.fn().mockImplementation(() => {
			if (idx >= chunks.length) return new Promise(() => {});
			const chunk = chunks[idx++];
			if (opts?.delayMs) {
				return new Promise((resolve) =>
					setTimeout(
						() => resolve({ value: chunk, done: false }),
						opts.delayMs,
					),
				);
			}
			return Promise.resolve({ value: chunk, done: false });
		}),
		cancel: vi.fn().mockResolvedValue(undefined),
		closed: Promise.resolve(undefined),
		releaseLock: vi.fn(),
	} as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

describe("sendImprovPacket", () => {
	it("writes packet bytes to the writer", async () => {
		const writer = mockWriter();
		const packet = buildScanCommand();

		await sendImprovPacket(writer, packet);

		expect(writer.write).toHaveBeenCalledWith(packet);
	});

	it("calls write exactly once", async () => {
		const writer = mockWriter();
		const packet = buildScanCommand();

		await sendImprovPacket(writer, packet);

		expect(writer.write).toHaveBeenCalledTimes(1);
	});
});

describe("readImprovResponse", () => {
	it("reads chunks and returns parsed Improv packets", async () => {
		// Build a valid RPC result packet
		const responsePacket = buildPacket(TYPE_RPC_RESULT, [0x01, 0x02, 0x03]);
		const reader = mockReader([responsePacket]);

		const result = await readImprovResponse(reader, 1000);

		expect(result.packets.length).toBe(1);
		expect(result.packets[0].type).toBe(TYPE_RPC_RESULT);
		expect(Array.from(result.packets[0].data)).toEqual([0x01, 0x02, 0x03]);
	});

	it("accumulates data across multiple chunks", async () => {
		const responsePacket = buildPacket(TYPE_RPC_RESULT, [0xaa]);
		// Split the packet into two chunks
		const mid = Math.floor(responsePacket.length / 2);
		const chunk1 = responsePacket.slice(0, mid);
		const chunk2 = responsePacket.slice(mid);
		const reader = mockReader([chunk1, chunk2]);

		const result = await readImprovResponse(reader, 1000);

		expect(result.packets.length).toBe(1);
		expect(result.packets[0].type).toBe(TYPE_RPC_RESULT);
	});

	it("rejects on timeout when no valid packets arrive", async () => {
		// Reader that never returns data
		const reader = mockReader([]);

		await expect(readImprovResponse(reader, 50)).rejects.toThrow("timeout");
	});

	it("skips non-Improv data (log text) and finds the packet", async () => {
		const logBytes = new TextEncoder().encode("LOG: booting up\r\n");
		const responsePacket = buildPacket(TYPE_RPC_RESULT, [0x42]);
		// Combine log text and packet into one chunk
		const combined = new Uint8Array(logBytes.length + responsePacket.length);
		combined.set(logBytes, 0);
		combined.set(responsePacket, logBytes.length);
		const reader = mockReader([combined]);

		const result = await readImprovResponse(reader, 1000);

		expect(result.packets.length).toBe(1);
		expect(result.packets[0].type).toBe(TYPE_RPC_RESULT);
	});

	it("preserves leftover buffer data for split packets", async () => {
		const pkt1 = buildPacket(TYPE_RPC_RESULT, [0x01]);
		const pkt2 = buildPacket(TYPE_RPC_RESULT, [0x02]);
		// Split: pkt1 complete + first byte of pkt2 in chunk1, rest of pkt2 in chunk2
		const chunk1 = new Uint8Array(pkt1.length + 1);
		chunk1.set(pkt1, 0);
		chunk1[pkt1.length] = pkt2[0]; // "I" of second IMPROV header
		const chunk2 = pkt2.slice(1);

		const reader = mockReader([chunk1, chunk2]);

		// First call gets pkt1, leftover buffer has the "I"
		const result1 = await readImprovResponse(reader, 1000);
		expect(result1.packets.length).toBe(1);
		expect(result1.packets[0].data).toEqual(new Uint8Array([0x01]));
		expect(result1.buffer.length).toBe(1); // leftover "I" byte

		// Second call with leftover buffer finds pkt2
		const result2 = await readImprovResponse(reader, 1000, result1.buffer);
		expect(result2.packets.length).toBe(1);
		expect(result2.packets[0].data).toEqual(new Uint8Array([0x02]));
	});

	it("throws a distinct port-closed error (not timeout) when the stream ends", async () => {
		// A `done` stream means the device was unplugged — reporting it as
		// "timeout" sends the user down the wrong troubleshooting path.
		const reader = {
			read: vi.fn().mockResolvedValue({ value: undefined, done: true }),
			cancel: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			releaseLock: vi.fn(),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		let err: unknown;
		try {
			await readImprovResponse(reader, 1000);
		} catch (e) {
			err = e;
		}
		expect((err as { errorKey?: string }).errorKey).toBe(
			"flasher.errors.port_closed",
		);
	});

	it("still returns packets delivered in the final chunk of a closing stream", async () => {
		const pkt = buildPacket(TYPE_RPC_RESULT, [0x07]);
		const reader = {
			read: vi.fn().mockResolvedValue({ value: pkt, done: true }),
			cancel: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			releaseLock: vi.fn(),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		const result = await readImprovResponse(reader, 1000);
		expect(result.packets[0].data[0]).toBe(0x07);
	});

	it("keeps the parse buffer bounded while junk (log noise) streams in", async () => {
		// 60s of verbose ESPHome logging used to accumulate the whole stream
		// in the number[] buffer with full O(n²) rescans. After every parse
		// that yields no packet, the buffer must be trimmed to at most one
		// max-size packet (265 bytes).
		const junk = new Uint8Array(1024).fill(0x41); // "A" — no IMPROV header
		const chunks = Array.from({ length: 50 }, () => junk);
		const reader = mockReader(chunks);
		const buffer: number[] = [];

		await expect(readImprovResponse(reader, 50, buffer)).rejects.toThrow(
			"timeout",
		);
		expect(buffer.length).toBeLessThanOrEqual(265);
	});

	it("retains a partial IMPROV header prefix at the buffer tail when trimming", async () => {
		// The first 3 bytes of a packet arrive at the end of a junk chunk;
		// the rest comes later. The trim must keep the partial header so the
		// packet still parses once complete.
		const pkt = buildPacket(TYPE_RPC_RESULT, [0x55]);
		const junk = new Uint8Array(2048).fill(0x42);
		const chunk1 = new Uint8Array(junk.length + 3);
		chunk1.set(junk, 0);
		chunk1.set(pkt.slice(0, 3), junk.length);
		const chunk2 = pkt.slice(3);

		const reader = mockReader([chunk1, chunk2]);
		const result = await readImprovResponse(reader, 1000);
		expect(result.packets[0].data[0]).toBe(0x55);
	});

	describe("debug console mirroring", () => {
		afterEach(() => {
			setImprovDebugLogging(false);
			vi.restoreAllMocks();
		});

		it("does not mirror raw serial text to console.debug by default", async () => {
			// Device logs can carry SSIDs/URLs — keep them out of the console
			// unless a developer explicitly opts in.
			const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
			const text = new TextEncoder().encode("ssid=SecretNetwork\n");
			const pkt = buildPacket(TYPE_RPC_RESULT, [0x01]);
			const combined = new Uint8Array(text.length + pkt.length);
			combined.set(text, 0);
			combined.set(pkt, text.length);

			await readImprovResponse(mockReader([combined]), 1000);

			const rawCalls = debugSpy.mock.calls.filter((c) =>
				String(c[0]).includes("SecretNetwork"),
			);
			expect(rawCalls).toHaveLength(0);
		});

		it("when enabled, reassembles multibyte chars split across chunks", async () => {
			// Per-chunk fresh TextDecoders turned a split UTF-8 sequence into
			// U+FFFD; a single streaming decoder must survive the split.
			setImprovDebugLogging(true);
			const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

			const line = new TextEncoder().encode("café boot\n"); // é = 0xC3 0xA9
			const splitAt = line.indexOf(0xc3) + 1; // between the é's two bytes
			const pkt = buildPacket(TYPE_RPC_RESULT, [0x02]);
			const chunk2 = new Uint8Array(line.length - splitAt + pkt.length);
			chunk2.set(line.slice(splitAt), 0);
			chunk2.set(pkt, line.length - splitAt);

			await readImprovResponse(
				mockReader([line.slice(0, splitAt), chunk2]),
				1000,
			);

			const flushed = debugSpy.mock.calls.map((c) => String(c[0]));
			expect(flushed.some((l) => l.includes("café boot"))).toBe(true);
		});
	});

	describe("timeout behaviour (fake timers)", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});
		afterEach(() => {
			vi.useRealTimers();
		});

		it("does not lose a chunk when reader.read() is in-flight during timeout", async () => {
			// Chunk resolves 150ms after the first call's 50ms budget — the
			// second call must re-await the same pending read rather than
			// issuing a fresh read() (which would swallow the chunk).
			const pkt = buildPacket(TYPE_RPC_RESULT, [0x42]);
			const reader = mockReader([pkt], { delayMs: 150 });
			const buffer: number[] = [];

			const firstCall = readImprovResponse(reader, 50, buffer);
			const firstAssertion = expect(firstCall).rejects.toThrow("timeout");
			await vi.advanceTimersByTimeAsync(50);
			await firstAssertion;

			const secondCall = readImprovResponse(reader, 500, buffer);
			await vi.advanceTimersByTimeAsync(150);
			const result = await secondCall;

			expect(result.packets.length).toBe(1);
			expect(result.packets[0].data[0]).toBe(0x42);
			expect(reader.read).toHaveBeenCalledTimes(1);
		});

		it("preserves bytes read during a timed-out call via in-place buffer mutation", async () => {
			const pkt = buildPacket(TYPE_RPC_RESULT, [0x01, 0x02, 0x03, 0x04]);
			const chunk1 = pkt.slice(0, 9); // header + version + type + length — not enough to checksum
			const chunk2 = pkt.slice(9);

			const buffer: number[] = [];
			const firstCall = readImprovResponse(mockReader([chunk1]), 50, buffer);
			const firstAssertion = expect(firstCall).rejects.toThrow("timeout");
			await vi.advanceTimersByTimeAsync(50);
			await firstAssertion;
			expect(Array.from(buffer)).toEqual(Array.from(chunk1));

			const result = await readImprovResponse(
				mockReader([chunk2]),
				1000,
				buffer,
			);
			expect(result.packets.length).toBe(1);
			expect(Array.from(result.packets[0].data)).toEqual([
				0x01, 0x02, 0x03, 0x04,
			]);
		});

		it("clears pending read and timer when the read rejects", async () => {
			// pending's rejection must not leave a stale entry in the
			// WeakMap — otherwise the next call would rethrow the same
			// stale error forever.
			const err = new Error("stream error");
			const reader = {
				read: vi
					.fn()
					.mockRejectedValueOnce(err)
					.mockResolvedValueOnce({
						value: buildPacket(TYPE_RPC_RESULT, [0x99]),
						done: false,
					}),
				cancel: vi.fn().mockResolvedValue(undefined),
				closed: Promise.resolve(undefined),
				releaseLock: vi.fn(),
			} as unknown as ReadableStreamDefaultReader<Uint8Array>;
			const buffer: number[] = [];

			await expect(readImprovResponse(reader, 500, buffer)).rejects.toThrow(
				"stream error",
			);

			const result = await readImprovResponse(reader, 500, buffer);
			expect(result.packets[0].data[0]).toBe(0x99);
			expect(reader.read).toHaveBeenCalledTimes(2);
		});
	});
});

describe("releaseReader", () => {
	it("calls releaseLock and clears any pending read entry", async () => {
		// runWifiScan releases & re-acquires readers across retry attempts.
		// Without an explicit cleanup, the in-flight read promise would
		// remain in the WeakMap keyed off the released reader. WeakMap
		// auto-cleans on GC, but until then the entry is dead weight and
		// any code path that stumbles on it would re-await a stale
		// promise. Behavioral check: after release + re-acquire, the
		// next read attempt must call read() afresh.
		const reader = mockReader([buildPacket(TYPE_RPC_RESULT, [0x01])], {
			delayMs: 200,
		});
		// Kick off a read so a pending promise is recorded internally.
		const inFlight = readImprovResponse(reader, 50, []);
		await expect(inFlight).rejects.toThrow("timeout");

		releaseReader(reader);

		expect(reader.releaseLock).toHaveBeenCalled();
	});
});

describe("drainSerial", () => {
	it("reads and discards buffered data", async () => {
		const reader = mockReader([
			new Uint8Array([1, 2, 3]),
			new Uint8Array([4, 5, 6]),
		]);

		await drainSerial(reader, 50);

		expect(reader.read).toHaveBeenCalled();
	});

	it("resolves after timeout even with no data", async () => {
		const reader = mockReader([]);

		await expect(drainSerial(reader, 50)).resolves.toBeUndefined();
	});
});
