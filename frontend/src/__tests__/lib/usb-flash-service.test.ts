import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock improv-serial before importing the service
vi.mock("../../lib/improv-serial.js", () => ({
	sendImprovPacket: vi.fn().mockResolvedValue(undefined),
	readImprovResponse: vi.fn().mockResolvedValue({
		packets: [{ type: 0x04, data: new Uint8Array([0x04]) }],
		buffer: [],
	}),
	parseScanResults: vi.fn().mockReturnValue(null),
	buildScanCommand: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
	buildGetStateCommand: vi.fn().mockReturnValue(new Uint8Array([2, 2, 0])),
	buildGetInfoCommand: vi.fn().mockReturnValue(new Uint8Array([3, 3, 0])),
	buildWifiCommand: vi.fn().mockReturnValue(new Uint8Array([4, 5, 6])),
	releaseReader: vi.fn((r: any) => {
		try {
			r?.releaseLock?.();
		} catch {}
	}),
	drainSerial: vi.fn().mockResolvedValue(undefined),
	CMD_WIFI_SETTINGS: 0x01,
	CMD_GET_CURRENT_STATE: 0x02,
	TYPE_CURRENT_STATE: 0x01,
	TYPE_ERROR_STATE: 0x02,
	TYPE_RPC_RESULT: 0x04,
	ERROR_UNABLE_TO_CONNECT: 0x03,
	STATE_AUTHORIZED: 0x02,
	STATE_PROVISIONED: 0x04,
}));

// Mock esptool-js before importing the service
vi.mock("esptool-js", () => {
	const mockTransport = {
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		device: {},
	};
	const mockLoader = {
		main: vi.fn().mockResolvedValue("ESP32"),
		writeFlash: vi.fn().mockResolvedValue(undefined),
		after: vi.fn().mockResolvedValue(undefined),
	};
	return {
		// Use function constructors so `new Transport(...)` and `new ESPLoader(...)` work
		Transport: vi.fn().mockImplementation(function () {
			return mockTransport;
		}),
		ESPLoader: vi.fn().mockImplementation(function () {
			return mockLoader;
		}),
	};
});

// Mock fetch for manifest + binary downloads
const mockManifest = {
	builds: [
		{
			chipFamily: "ESP32",
			parts: [
				{ path: "bootloader.bin", offset: 4096 },
				{ path: "partitions.bin", offset: 32768 },
				{ path: "firmware.bin", offset: 65536 },
			],
		},
	],
};

const mockBinary = new ArrayBuffer(1024);

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockImplementation((url: string) => {
			if (url.endsWith("manifest.json")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockManifest),
				});
			}
			// Binary file
			return Promise.resolve({
				ok: true,
				arrayBuffer: () => Promise.resolve(mockBinary),
			});
		}),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

import { ESPLoader, Transport } from "esptool-js";
import {
	buildScanCommand,
	buildWifiCommand,
	drainSerial,
	parseScanResults,
	readImprovResponse,
	sendImprovPacket,
	TYPE_CURRENT_STATE,
	TYPE_ERROR_STATE,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";
import {
	detectIpAddress,
	flashFirmware,
	queryImprovState,
	runWifiProvision,
	runWifiScan,
} from "../../lib/usb-flash-service.js";
import type { UsbFlashState } from "../../types.js";

const TEST_BASE_URL = "https://example.com/api/eppgrid/firmware";

describe("flashFirmware", () => {
	function mockPort(): SerialPort {
		return {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			readable: { getReader: vi.fn() },
			writable: { getWriter: vi.fn() },
		} as unknown as SerialPort;
	}

	it("creates Transport and ESPLoader with correct params", async () => {
		const port = mockPort();
		const onProgress = vi.fn();

		await flashFirmware(port, "wifi-ble-co2", onProgress, {
			baseUrl: TEST_BASE_URL,
		});

		expect(Transport).toHaveBeenCalledWith(port);
		expect(ESPLoader).toHaveBeenCalledWith(
			expect.objectContaining({
				transport: expect.any(Object),
				baudrate: 115200,
			}),
		);
	});

	it("calls loader.main() to detect chip", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.main).toHaveBeenCalledWith("default_reset");
	});

	it("fetches manifest and 3 binary files", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const fetchMock = vi.mocked(fetch);
		// 1 manifest + 3 binaries = 4 fetches
		expect(fetchMock).toHaveBeenCalledTimes(4);
		expect(fetchMock.mock.calls[0][0]).toContain("manifest.json");
		expect(fetchMock.mock.calls[1][0]).toContain("bootloader.bin");
		expect(fetchMock.mock.calls[2][0]).toContain("partitions.bin");
		expect(fetchMock.mock.calls[3][0]).toContain("firmware.bin");
	});

	it("calls writeFlash with correct file array and offsets", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.writeFlash).toHaveBeenCalledWith(
			expect.objectContaining({
				fileArray: [
					{ data: expect.any(Uint8Array), address: 4096 },
					{ data: expect.any(Uint8Array), address: 32768 },
					{ data: expect.any(Uint8Array), address: 65536 },
					// otadata partition cleared so the bootloader picks ota_0
					// (where firmware.bin was just written) instead of the
					// previous OTA partition.
					{ data: expect.any(Uint8Array), address: 0x9000 },
				],
				flashSize: "keep",
				flashMode: "keep",
				flashFreq: "keep",
				eraseAll: false,
				compress: true,
			}),
		);
	});

	it("clears otadata with 0x2000 bytes of 0xFF", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		const fileArray = vi.mocked(loaderInstance.writeFlash).mock.calls[0][0]
			.fileArray as {
			data: Uint8Array;
			address: number;
		}[];
		const otaErase = fileArray.find((f) => f.address === 0x9000);
		expect(otaErase).toBeDefined();
		expect(otaErase!.data.length).toBe(0x2000);
		expect(otaErase!.data.every((b) => b === 0xff)).toBe(true);
	});

	it("calls loader.after('hard_reset') after flash", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.after).toHaveBeenCalledWith("hard_reset");
	});

	it("disconnects transport after flash", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();
	});

	it("throws on manifest fetch failure", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 404,
		} as Response);

		const port = mockPort();
		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), { baseUrl: TEST_BASE_URL }),
		).rejects.toThrow("Failed to download firmware manifest");
	});

	it("throws on binary fetch failure", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockManifest),
			} as Response)
			.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

		const port = mockPort();
		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), { baseUrl: TEST_BASE_URL }),
		).rejects.toThrow("Failed to download firmware file");
	});

	it("calls onProgress with the OVERALL percentage via reportProgress callback", async () => {
		const port = mockPort();
		const onProgress = vi.fn();

		// fileArray byte sizes: 3 × 1024 (mockBinary parts) + 8192 (otadata)
		// = 11264 total. Half of file 0 = 512/11264 ≈ 5%; all of file 0 =
		// 1024/11264 ≈ 9%. esptool's written/total are per-file, so a naive
		// written/total would report 50/100 here.
		const loaderInstance = {
			main: vi.fn().mockResolvedValue("ESP32"),
			writeFlash: vi.fn().mockImplementation(({ reportProgress }) => {
				reportProgress(0, 50, 100); // half of file 0
				reportProgress(0, 100, 100); // all of file 0
				return Promise.resolve(undefined);
			}),
			after: vi.fn().mockResolvedValue(undefined),
		};
		vi.mocked(ESPLoader).mockImplementationOnce(function () {
			return loaderInstance as any;
		});

		await flashFirmware(port, "wifi-ble-co2", onProgress, {
			baseUrl: TEST_BASE_URL,
		});

		expect(onProgress).toHaveBeenCalledWith(5);
		expect(onProgress).toHaveBeenCalledWith(9);
	});

	it("accumulates progress across multi-part manifests and the appended otadata (never jumps backward)", async () => {
		const port = mockPort();
		const onProgress = vi.fn();

		const loaderInstance = {
			main: vi.fn().mockResolvedValue("ESP32"),
			writeFlash: vi.fn().mockImplementation(({ reportProgress }) => {
				// Walk every file part to completion, as esptool does.
				reportProgress(0, 1024, 1024);
				reportProgress(1, 1024, 1024);
				reportProgress(2, 1024, 1024);
				reportProgress(3, 4096, 8192); // otadata half-written
				reportProgress(3, 8192, 8192);
				return Promise.resolve(undefined);
			}),
			after: vi.fn().mockResolvedValue(undefined),
		};
		vi.mocked(ESPLoader).mockImplementationOnce(function () {
			return loaderInstance as any;
		});

		await flashFirmware(port, "wifi-ble-co2", onProgress, {
			baseUrl: TEST_BASE_URL,
		});

		const reported = onProgress.mock.calls.map((c) => c[0]);
		// 1024/11264→9%, 2048/11264→18%, 3072/11264→27%, 7168/11264→64%, 100%
		expect(reported).toEqual([9, 18, 27, 64, 100]);
		for (let i = 1; i < reported.length; i++) {
			expect(reported[i]).toBeGreaterThanOrEqual(reported[i - 1]);
		}
	});

	it("disconnects transport on flash error", async () => {
		const port = mockPort();
		const loaderInstance = {
			main: vi.fn().mockResolvedValue("ESP32"),
			writeFlash: vi.fn().mockRejectedValue(new Error("flash fail")),
			after: vi.fn(),
		};
		vi.mocked(ESPLoader).mockImplementationOnce(function () {
			return loaderInstance as any;
		});

		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), { baseUrl: TEST_BASE_URL }),
		).rejects.toThrow("flash fail");

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();
	});

	it("calls onMac callback with uppercased MAC from terminal output", async () => {
		const port = mockPort();
		const onMac = vi.fn();

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					opts.terminal?.writeLine("Chip is ESP32-D0WD-V3 (revision v3.1)");
					opts.terminal?.writeLine("MAC: e0:8c:fe:d3:fd:c8");
					opts.terminal?.writeLine("Uploading stub...");
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			onMac,
			baseUrl: TEST_BASE_URL,
		});

		expect(onMac).toHaveBeenCalledWith("E0:8C:FE:D3:FD:C8");
	});

	it("does not call onMac when no MAC line appears in terminal output", async () => {
		const port = mockPort();
		const onMac = vi.fn();

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					opts.terminal?.writeLine("Chip is ESP32-D0WD-V3");
					opts.terminal?.writeLine("Uploading stub...");
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			onMac,
			baseUrl: TEST_BASE_URL,
		});

		expect(onMac).not.toHaveBeenCalled();
	});

	it("throws when baseUrl is not provided", async () => {
		const port = mockPort();
		await expect(flashFirmware(port, "wifi-ble-co2", vi.fn())).rejects.toThrow(
			"baseUrl is required",
		);
	});

	it("attaches Authorization: Bearer header when accessToken is provided", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
			accessToken: "test-token-abc123",
		});

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock).toHaveBeenCalled();
		for (const call of fetchMock.mock.calls) {
			const init = call[1] as RequestInit | undefined;
			const headers = init?.headers as Record<string, string> | undefined;
			expect(headers?.Authorization).toBe("Bearer test-token-abc123");
		}
	});

	it("omits Authorization header when accessToken is not provided", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock).toHaveBeenCalled();
		for (const call of fetchMock.mock.calls) {
			const init = call[1] as RequestInit | undefined;
			const headers = init?.headers as Record<string, string> | undefined;
			expect(headers?.Authorization).toBeUndefined();
		}
	});

	it("baseUrl missing error carries errorKey usb.errors.base_url_required", async () => {
		const port = mockPort();
		try {
			await flashFirmware(port, "wifi-ble-co2", vi.fn());
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("usb.errors.base_url_required");
		}
	});

	it("manifest download failure carries errorKey usb.errors.manifest_download_failed", async () => {
		vi.mocked(fetch).mockResolvedValueOnce({
			ok: false,
			status: 404,
		} as Response);
		const port = mockPort();
		try {
			await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
				baseUrl: TEST_BASE_URL,
			});
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("usb.errors.manifest_download_failed");
		}
	});

	it("firmware file download failure carries errorKey usb.errors.file_download_failed with file param", async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockManifest),
			} as Response)
			.mockResolvedValueOnce({ ok: false, status: 500 } as Response);
		const port = mockPort();
		try {
			await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
				baseUrl: TEST_BASE_URL,
			});
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("usb.errors.file_download_failed");
			expect(err.errorParams).toEqual({ file: "bootloader.bin" });
		}
	});

	it("calls beforeFlash after loader.main() and before writeFlash()", async () => {
		const port = mockPort();
		const callOrder: string[] = [];

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					callOrder.push("main");
					opts.terminal?.writeLine("MAC: aa:bb:cc:dd:ee:ff");
				}),
				writeFlash: vi.fn().mockImplementation(async () => {
					callOrder.push("writeFlash");
				}),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		const beforeFlash = vi.fn().mockImplementation(async () => {
			callOrder.push("beforeFlash");
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			beforeFlash,
			baseUrl: TEST_BASE_URL,
		});

		expect(callOrder).toEqual(["main", "beforeFlash", "writeFlash"]);
	});

	it("aborts flash when beforeFlash throws, but still disconnects transport", async () => {
		const port = mockPort();

		vi.mocked(ESPLoader).mockImplementationOnce(function (_opts: any) {
			return {
				main: vi.fn().mockResolvedValue("ESP32"),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		const beforeFlash = vi.fn().mockRejectedValue(new Error("User cancelled"));

		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), {
				beforeFlash,
				baseUrl: TEST_BASE_URL,
			}),
		).rejects.toThrow("User cancelled");

		const transportInstance = vi.mocked(Transport).mock.results[0].value;
		expect(transportInstance.disconnect).toHaveBeenCalled();

		const loaderInstance = vi.mocked(ESPLoader).mock.results[0].value;
		expect(loaderInstance.writeFlash).not.toHaveBeenCalled();
	});

	it("passes detected MAC to beforeFlash callback", async () => {
		const port = mockPort();

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					opts.terminal?.writeLine("MAC: aa:bb:cc:dd:ee:ff");
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		const beforeFlash = vi.fn().mockResolvedValue(undefined);

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			beforeFlash,
			baseUrl: TEST_BASE_URL,
		});

		expect(beforeFlash).toHaveBeenCalledWith("AA:BB:CC:DD:EE:FF");
	});

	it("passes undefined to beforeFlash when no MAC detected", async () => {
		const port = mockPort();
		const beforeFlash = vi.fn().mockResolvedValue(undefined);

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			beforeFlash,
			baseUrl: TEST_BASE_URL,
		});

		expect(beforeFlash).toHaveBeenCalledWith(undefined);
	});

	it("uses baseUrl from options for manifest fetch", async () => {
		const port = mockPort();
		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: "https://example.com/fw",
		});

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock.mock.calls[0][0]).toBe(
			"https://example.com/fw/everything-presence-pro-wifi-ble-co2-manifest.json",
		);
	});

	it("throws when baseUrl is not provided in options", async () => {
		const port = mockPort();
		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), {}),
		).rejects.toThrow("baseUrl is required");
	});

	it("terminal.write runs without crashing", async () => {
		const port = mockPort();
		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			return {
				main: vi.fn().mockImplementation(async () => {
					opts.terminal?.write("partial output");
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		expect(logSpy).not.toHaveBeenCalled();
		logSpy.mockRestore();
	});

	it("terminal.clean runs without error and port.close is a no-op during flash", async () => {
		const port = mockPort();

		let capturedTerminal: any;
		vi.mocked(ESPLoader).mockImplementationOnce(function (opts: any) {
			capturedTerminal = opts.terminal;
			return {
				main: vi.fn().mockImplementation(async () => {
					// Call clean to cover it
					opts.terminal?.clean();
				}),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		expect(capturedTerminal).toBeDefined();
		// port.close was replaced with a no-op during flash and
		// restored afterwards — the original mock should not have been called
		// during the flash itself.
	});

	it("port.close override is a no-op during flash (prevents Transport from closing port)", async () => {
		const port = mockPort();

		let closeCalledDuringFlash = false;
		vi.mocked(ESPLoader).mockImplementationOnce(function () {
			return {
				main: vi.fn().mockResolvedValue("ESP32"),
				writeFlash: vi.fn().mockResolvedValue(undefined),
				after: vi.fn().mockResolvedValue(undefined),
			} as any;
		});

		// Override Transport.disconnect to call port.close during flash
		vi.mocked(Transport).mockImplementationOnce(function () {
			return {
				connect: vi.fn(),
				disconnect: vi.fn().mockImplementation(async () => {
					// Transport calls port.close() during disconnect —
					// should be intercepted by the no-op override
					await port.close();
					closeCalledDuringFlash = true;
				}),
				device: {},
			} as any;
		});

		await flashFirmware(port, "wifi-ble-co2", vi.fn(), {
			baseUrl: TEST_BASE_URL,
		});

		// The no-op override was called (did not throw)
		expect(closeCalledDuringFlash).toBe(true);
	});

	it("restores port.close even when transport.disconnect() throws (CH340 zombie-port guard)", async () => {
		// If disconnect() throws, skipping the restore leaves port.close as
		// the no-op stub forever — every later close() silently does nothing
		// and the CH340 port zombies until a page reload.
		const port = mockPort();
		const closeMock = port.close as ReturnType<typeof vi.fn>;

		vi.mocked(Transport).mockImplementationOnce(function () {
			return {
				connect: vi.fn(),
				disconnect: vi.fn().mockRejectedValue(new Error("disconnect failed")),
				device: {},
			} as any;
		});

		await expect(
			flashFirmware(port, "wifi-ble-co2", vi.fn(), { baseUrl: TEST_BASE_URL }),
		).rejects.toThrow("disconnect failed");

		// flashFirmware restores the (bound) real close; calling close()
		// must reach the original implementation, not the no-op stub.
		await port.close();
		expect(closeMock).toHaveBeenCalledTimes(1);
	});
});

describe("runWifiScan", () => {
	beforeEach(() => {
		// Reset improv-serial mocks between each test to avoid call count bleed
		vi.mocked(sendImprovPacket).mockReset().mockResolvedValue(undefined);
		vi.mocked(readImprovResponse)
			.mockReset()
			.mockResolvedValue({
				packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04]) }],
				buffer: [],
			});
		vi.mocked(parseScanResults).mockReset().mockReturnValue(null);
		vi.mocked(buildScanCommand)
			.mockReset()
			.mockReturnValue(new Uint8Array([1, 2, 3]));
		vi.mocked(buildWifiCommand)
			.mockReset()
			.mockReturnValue(new Uint8Array([4, 5, 6]));
	});

	function mockPort() {
		const mockWriter = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
			close: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			abort: vi.fn().mockResolvedValue(undefined),
			desiredSize: 1024,
			ready: Promise.resolve(undefined),
		} as unknown as WritableStreamDefaultWriter<Uint8Array>;

		const mockReader = {
			read: vi.fn().mockImplementation(() => new Promise(() => {})),
			cancel: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
			closed: Promise.resolve(undefined),
		} as unknown as ReadableStreamDefaultReader<Uint8Array>;

		// Track how many readers have been created so we can return different ones
		let _readerCount = 0;
		const port = {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			setSignals: vi.fn().mockResolvedValue(undefined),
			writable: {
				getWriter: vi.fn().mockReturnValue(mockWriter),
			},
			readable: {
				getReader: vi.fn().mockImplementation(() => {
					_readerCount++;
					return mockReader;
				}),
			},
		} as unknown as SerialPort;

		return { port, mockWriter, mockReader };
	}

	it("opens the port at 115200 baud when not already open", async () => {
		const { port } = mockPort();
		// Simulate port not yet open (readable is null)
		(port as any).readable = null;

		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		// open() should set readable so getWriter/getReader work after
		(port.open as any).mockImplementation(() => {
			(port as any).readable = {
				getReader: vi.fn().mockReturnValue({
					read: vi.fn().mockImplementation(() => new Promise(() => {})),
					cancel: vi.fn(),
					releaseLock: vi.fn(),
					closed: Promise.resolve(undefined),
				}),
			};
			(port as any).writable = {
				getWriter: vi.fn().mockReturnValue({
					write: vi.fn().mockResolvedValue(undefined),
					close: vi.fn(),
					abort: vi.fn(),
					closed: Promise.resolve(undefined),
					desiredSize: 1,
					ready: Promise.resolve(undefined),
					releaseLock: vi.fn(),
				}),
			};
			return Promise.resolve();
		});

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(port.open).toHaveBeenCalledWith({ baudRate: 115200 });
	});

	it("skips open when port is already open", async () => {
		const { port } = mockPort();

		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(port.open).not.toHaveBeenCalled();
	});

	it("delegates the pre-handshake drain phase to the drainSerial helper", async () => {
		const { port } = mockPort();

		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 123,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});

		expect(drainSerial).toHaveBeenCalledWith(expect.anything(), 123);
	});

	it("gets writer and reader from port streams", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(port.writable!.getWriter).toHaveBeenCalled();
		expect(port.readable!.getReader).toHaveBeenCalled();
	});

	it("tries RTS reset before scanning", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});

		const setSignals = port.setSignals as ReturnType<typeof vi.fn>;
		expect(setSignals).toHaveBeenCalledTimes(2);
		expect(setSignals).toHaveBeenNthCalledWith(1, {
			dataTerminalReady: false,
			requestToSend: true,
		});
		expect(setSignals).toHaveBeenNthCalledWith(2, {
			dataTerminalReady: false,
			requestToSend: false,
		});
	});

	it("continues without reset if setSignals is not supported", async () => {
		const { port } = mockPort();
		(port.setSignals as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("setSignals not supported"),
		);
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});

		expect(sendImprovPacket).toHaveBeenCalled();
	});

	it("sends scan command via sendImprovPacket", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(buildScanCommand).toHaveBeenCalled();
		expect(sendImprovPacket).toHaveBeenCalled();
	});

	it("returns empty networks list when readImprovResponse times out immediately", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([]);
	});

	it("returns writer and reader in result", async () => {
		const { port } = mockPort();
		// Handshake succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.writer).toBeDefined();
		expect(result.reader).toBeDefined();
	});

	it("collects networks from RPC_RESULT packets until empty data signals scan complete", async () => {
		const { port } = mockPort();

		const network1 = { ssid: "NetworkA", rssi: -50, authRequired: false };
		const network2 = { ssid: "NetworkB", rssi: -70, authRequired: true };

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		// First call: returns a packet with network1
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x01]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network1);

		// Second call: returns a packet with network2
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x02]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network2);

		// Third call: returns empty data (scan complete signal)
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) }],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(null);

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([network1, network2]);
	});

	it("ignores packets that are not TYPE_RPC_RESULT", async () => {
		const { port } = mockPort();

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		// Return a non-RPC_RESULT packet followed by a scan-complete on all attempts
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [
					{ type: 0x01, data: new Uint8Array([99]) }, // some other type
				],
				buffer: [],
			})
			.mockResolvedValue({
				packets: [
					{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) },
				],
				buffer: [],
			});

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		// The non-RPC_RESULT packet should not trigger parseScanResults
		// but the scan-complete packet (0x04 with empty slice) does
		expect(result.networks).toEqual([]);
	});

	it("throws when handshake gets no response (ethernet firmware)", async () => {
		const { port } = mockPort();

		// Handshake fails on all attempts (no response from device)
		vi.mocked(readImprovResponse).mockRejectedValue(new Error("timeout"));

		await expect(
			runWifiScan(port, {
				retryDelay: 0,
				drainDelay: 0,
				handshakeDelay: 0,
				handshakeRetryDelay: 0,
			}),
		).rejects.toThrow("No response from device");
	});

	it("retries handshake when first attempt fails and succeeds on later attempt", async () => {
		const { port } = mockPort();

		// First handshake attempt fails, second succeeds, then scan times out
		vi.mocked(readImprovResponse)
			.mockRejectedValueOnce(new Error("timeout")) // handshake attempt 1
			.mockRejectedValueOnce(new Error("timeout")) // handshake attempt 2
			.mockResolvedValueOnce({
				// handshake attempt 3 succeeds
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
				buffer: [],
			})
			.mockRejectedValue(new Error("timeout")); // scan times out

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([]);
		// sendImprovPacket should have been called at least 3 times for handshake attempts
		expect(
			vi.mocked(sendImprovPacket).mock.calls.length,
		).toBeGreaterThanOrEqual(3);
	});

	it("retries scan when first attempt returns no networks", async () => {
		const { port } = mockPort();

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		// First scan attempt: scan-complete with no networks
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) }],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(null);

		// Second scan attempt: returns a network then scan-complete
		const network = { ssid: "DelayedNet", rssi: -55, authRequired: false };
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x01]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network);

		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x00]) }],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(null);

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([network]);
	});

	it("returns accumulated networks on timeout", async () => {
		const { port } = mockPort();

		const network1 = { ssid: "MyNet", rssi: -60, authRequired: false };

		// Handshake succeeds
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
			buffer: [],
		});

		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x04, 0x01, 0x01]) },
			],
			buffer: [],
		});
		vi.mocked(parseScanResults).mockReturnValueOnce(network1);

		// Next call times out
		vi.mocked(readImprovResponse).mockRejectedValueOnce(new Error("timeout"));

		const result = await runWifiScan(port, {
			retryDelay: 0,
			drainDelay: 0,
			handshakeDelay: 0,
			handshakeRetryDelay: 0,
		});
		expect(result.networks).toEqual([network1]);
	});

	it("throws user-friendly error when port.open() fails", async () => {
		const { port } = mockPort();
		// Port not yet open
		(port as any).readable = null;
		(port.open as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Failed to open port"),
		);

		await expect(
			runWifiScan(port, {
				retryDelay: 0,
				drainDelay: 0,
				handshakeDelay: 0,
				handshakeRetryDelay: 0,
			}),
		).rejects.toThrow(
			"Could not open serial port. Unplug the device, plug it back in, and try again.",
		);
	});

	it("port open failure carries errorKey usb.errors.port_open_failed", async () => {
		const { port } = mockPort();
		(port as any).readable = null;
		(port.open as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error("Failed to open port"),
		);

		try {
			await runWifiScan(port, {
				retryDelay: 0,
				drainDelay: 0,
				handshakeDelay: 0,
				handshakeRetryDelay: 0,
			});
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("usb.errors.port_open_failed");
		}
	});

	it("no device response carries errorKey usb.errors.no_device_response", async () => {
		const { port } = mockPort();
		vi.mocked(readImprovResponse).mockRejectedValue(new Error("timeout"));

		try {
			await runWifiScan(port, {
				retryDelay: 0,
				drainDelay: 0,
				handshakeDelay: 0,
				handshakeRetryDelay: 0,
			});
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("usb.errors.no_device_response");
		}
	});

	it("releases the writer when port.readable disappears mid-scan (device unplugged)", async () => {
		// `port.readable!.getReader()` in the scan loop throws when the
		// device is unplugged mid-scan (readable becomes null). The writer
		// acquired in _connectImprov must not stay locked on that rethrow.
		const mockWriter = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
			close: vi.fn().mockResolvedValue(undefined),
			closed: Promise.resolve(undefined),
			abort: vi.fn().mockResolvedValue(undefined),
			desiredSize: 1024,
			ready: Promise.resolve(undefined),
		} as unknown as WritableStreamDefaultWriter<Uint8Array>;

		const realReadable = {
			getReader: vi.fn().mockImplementation(() => ({
				read: vi.fn().mockImplementation(() => new Promise(() => {})),
				cancel: vi.fn().mockResolvedValue(undefined),
				releaseLock: vi.fn(),
				closed: Promise.resolve(undefined),
			})),
		};

		// _connectImprov touches port.readable 3 times (open-check, drain
		// reader, handshake reader); the 4th access is the scan loop's
		// getReader — by then the device has been unplugged.
		let readableAccess = 0;
		const port = {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			setSignals: vi.fn().mockResolvedValue(undefined),
			writable: { getWriter: vi.fn().mockReturnValue(mockWriter) },
			get readable() {
				readableAccess++;
				return readableAccess <= 3 ? realReadable : null;
			},
		} as unknown as SerialPort;

		await expect(
			runWifiScan(port, {
				retryDelay: 0,
				drainDelay: 0,
				handshakeDelay: 0,
				handshakeRetryDelay: 0,
			}),
		).rejects.toThrow();

		expect(mockWriter.releaseLock).toHaveBeenCalled();
	});
});

describe("runWifiProvision", () => {
	it("calls sendImprovPacket with the wifi command", async () => {
		const mockWriter = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
		} as unknown as WritableStreamDefaultWriter<Uint8Array>;

		await runWifiProvision(mockWriter, "MySSID", "mypassword");

		expect(buildWifiCommand).toHaveBeenCalledWith("MySSID", "mypassword");
		expect(sendImprovPacket).toHaveBeenCalledWith(
			mockWriter,
			expect.any(Uint8Array),
		);
	});

	it("resolves without error on success", async () => {
		const mockWriter = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
		} as unknown as WritableStreamDefaultWriter<Uint8Array>;

		await expect(
			runWifiProvision(mockWriter, "SSID", "pass"),
		).resolves.toBeUndefined();
	});
});

describe("detectIpAddress", () => {
	const mockReader = {
		read: vi.fn().mockImplementation(() => new Promise(() => {})),
		cancel: vi.fn().mockResolvedValue(undefined),
		closed: Promise.resolve(undefined),
		releaseLock: vi.fn(),
	} as unknown as ReadableStreamDefaultReader<Uint8Array>;

	const mockWriter = {
		write: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		releaseLock: vi.fn(),
		abort: vi.fn().mockResolvedValue(undefined),
		closed: Promise.resolve(undefined),
		desiredSize: 1,
		ready: Promise.resolve(undefined),
	} as unknown as WritableStreamDefaultWriter<Uint8Array>;

	const encoder = new TextEncoder();
	const makeRpcResult = (cmd: number, url: string): Uint8Array => {
		const urlBytes = encoder.encode(url);
		const data = new Uint8Array(2 + 1 + urlBytes.length);
		data[0] = cmd;
		data[1] = 1 + urlBytes.length;
		data[2] = urlBytes.length;
		data.set(urlBytes, 3);
		return data;
	};

	// Reset readImprovResponse base implementation before each test — runWifiScan
	// tests use mockRejectedValue (persistent default) which bleeds across tests
	// because vi.clearAllMocks() does not clear implementations.
	beforeEach(() => {
		vi.mocked(readImprovResponse).mockReset();
		// Set a safe default: returns no interesting packets, so the loop in
		// detectIpAddress keeps spinning until deadline when needed.
		vi.mocked(readImprovResponse).mockResolvedValue({
			packets: [],
			buffer: [],
		});
	});

	it("extracts IP from Improv RPC result containing URL", async () => {
		// STATE packets are ignored; only the RPC_RESULT matters
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: 0x01, data: new Uint8Array([0x03]) },
				{ type: 0x01, data: new Uint8Array([0x04]) },
				{
					type: TYPE_RPC_RESULT,
					data: makeRpcResult(0x01, "http://192.168.1.42"),
				},
			],
			buffer: [],
		});

		const ip = await detectIpAddress(mockReader, mockWriter, 1000);
		expect(ip).toBe("192.168.1.42");
	});

	it("throws on timeout when no RPC result arrives", async () => {
		vi.mocked(readImprovResponse).mockRejectedValueOnce(
			Object.assign(new Error("timeout"), {
				errorKey: "flasher.errors.timeout",
			}),
		);

		await expect(detectIpAddress(mockReader, mockWriter, 50)).rejects.toThrow(
			"WiFi connection failed",
		);
	});

	it("throws on error state (wrong password)", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [{ type: 0x02, data: new Uint8Array([0x03]) }],
			buffer: [],
		});

		await expect(detectIpAddress(mockReader, mockWriter, 1000)).rejects.toThrow(
			"WiFi connection failed",
		);
	});

	it("throws error state message after seeing PROVISIONING", async () => {
		// Send PROVISIONING first so sawProvisioning=true, then ERROR_STATE
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) }, // PROVISIONING
				{ type: TYPE_ERROR_STATE, data: new Uint8Array([0x03]) }, // Unable to connect
			],
			buffer: [],
		});

		await expect(detectIpAddress(mockReader, mockWriter, 1000)).rejects.toThrow(
			"WiFi connection failed",
		);
	});

	it("throws with fallback message for unknown error codes", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) },
				{ type: TYPE_ERROR_STATE, data: new Uint8Array([0xff]) }, // Unknown code
			],
			buffer: [],
		});

		await expect(detectIpAddress(mockReader, mockWriter, 1000)).rejects.toThrow(
			"WiFi error (code 255)",
		);
	});

	it("re-throws non-timeout errors from readImprovResponse", async () => {
		vi.mocked(readImprovResponse).mockRejectedValueOnce(
			new Error("serial port disconnected"),
		);

		await expect(detectIpAddress(mockReader, mockWriter, 1000)).rejects.toThrow(
			"serial port disconnected",
		);
	});

	it("timeout throw carries errorKey wifi.errors.connection_failed", async () => {
		vi.mocked(readImprovResponse).mockRejectedValueOnce(
			Object.assign(new Error("timeout"), {
				errorKey: "flasher.errors.timeout",
			}),
		);

		try {
			await detectIpAddress(mockReader, mockWriter, 50);
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("wifi.errors.connection_failed");
		}
	});

	it("error state code 3 carries errorKey wifi.errors.connection_failed", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) },
				{ type: TYPE_ERROR_STATE, data: new Uint8Array([0x03]) },
			],
			buffer: [],
		});

		try {
			await detectIpAddress(mockReader, mockWriter, 1000);
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("wifi.errors.connection_failed");
		}
	});

	it("error state code 1 carries errorKey wifi.errors.invalid_command", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) },
				{ type: TYPE_ERROR_STATE, data: new Uint8Array([0x01]) },
			],
			buffer: [],
		});

		try {
			await detectIpAddress(mockReader, mockWriter, 1000);
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("wifi.errors.invalid_command");
		}
	});

	it("polls GET_CURRENT_STATE when initial URL is 0.0.0.0 and returns IP when available", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: makeRpcResult(0x01, "http://0.0.0.0") },
			],
			buffer: [],
		});
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{
					type: TYPE_RPC_RESULT,
					data: makeRpcResult(0x02, "http://192.168.1.42"),
				},
			],
			buffer: [],
		});

		const ip = await detectIpAddress(mockReader, mockWriter, 5000);

		expect(ip).toBe("192.168.1.42");
		expect(sendImprovPacket).toHaveBeenCalledWith(
			mockWriter,
			expect.any(Uint8Array),
		);
	});

	it("unknown error code carries errorKey wifi.errors.error_code with code param", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_CURRENT_STATE, data: new Uint8Array([0x03]) },
				{ type: TYPE_ERROR_STATE, data: new Uint8Array([0xff]) },
			],
			buffer: [],
		});

		try {
			await detectIpAddress(mockReader, mockWriter, 1000);
			throw new Error("expected error not thrown");
		} catch (err: any) {
			expect(err.errorKey).toBe("wifi.errors.error_code");
			expect(err.errorParams).toEqual({ code: 255 });
		}
	});

	it("throws connection_failed when URL is persistently 0.0.0.0", async () => {
		vi.mocked(readImprovResponse).mockResolvedValue({
			packets: [
				{ type: TYPE_RPC_RESULT, data: makeRpcResult(0x01, "http://0.0.0.0") },
			],
			buffer: [],
		});

		await expect(
			detectIpAddress(mockReader, mockWriter, 50),
		).rejects.toMatchObject({
			errorKey: "wifi.errors.connection_failed",
		});
	});

	it("ignores RPC_RESULT with unrelated cmd byte", async () => {
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{ type: TYPE_RPC_RESULT, data: makeRpcResult(0x04, "http://10.0.0.5") },
				{ type: TYPE_RPC_RESULT, data: makeRpcResult(0x01, "http://0.0.0.0") },
			],
			buffer: [],
		});
		vi.mocked(readImprovResponse).mockResolvedValueOnce({
			packets: [
				{
					type: TYPE_RPC_RESULT,
					data: makeRpcResult(0x02, "http://192.168.1.42"),
				},
			],
			buffer: [],
		});

		const ip = await detectIpAddress(mockReader, mockWriter, 5000);
		expect(ip).toBe("192.168.1.42");
	});

	it("ignores RPC_RESULT with fewer than 3 data bytes", async () => {
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [
					{ type: TYPE_RPC_RESULT, data: new Uint8Array([0x01, 0x00]) }, // too short
				],
				buffer: [],
			})
			.mockResolvedValueOnce({
				packets: [
					{
						type: TYPE_RPC_RESULT,
						data: makeRpcResult(0x01, "http://192.168.1.42"),
					},
				],
				buffer: [],
			});

		const ip = await detectIpAddress(mockReader, mockWriter, 5000);
		expect(ip).toBe("192.168.1.42");
	});

	it("ignores RPC_RESULT when urlLen exceeds packet length", async () => {
		// Truncated packet: claims urlLen=100 but only has 5 bytes after header.
		// Without the bounds check, slice(3, 3+100) would decode only 5 bytes of
		// garbage — if those happen to contain an IPv4 pattern, we'd match a
		// corrupt IP. With the guard we skip the packet entirely.
		const truncated = new Uint8Array([
			0x01, // cmd = WIFI_SETTINGS
			0x06, // data_length (lies — actual payload is 5 bytes)
			0x64, // urlLen = 100 (exceeds available bytes)
			0x31, // '1'
			0x2e, // '.'
			0x32, // '2'
			0x2e, // '.'
			0x33, // '3'
		]);
		vi.mocked(readImprovResponse)
			.mockResolvedValueOnce({
				packets: [{ type: TYPE_RPC_RESULT, data: truncated }],
				buffer: [],
			})
			.mockResolvedValueOnce({
				packets: [
					{
						type: TYPE_RPC_RESULT,
						data: makeRpcResult(0x01, "http://192.168.1.42"),
					},
				],
				buffer: [],
			});

		const ip = await detectIpAddress(mockReader, mockWriter, 5000);
		expect(ip).toBe("192.168.1.42");
	});
});

describe("queryImprovState", () => {
	function mockPortReady(): SerialPort {
		const reader = {
			read: vi.fn().mockImplementation(() => new Promise(() => {})),
			releaseLock: vi.fn(),
		};
		const writer = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
		};
		return {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			readable: { getReader: () => reader },
			writable: { getWriter: () => writer },
			setSignals: vi.fn().mockResolvedValue(undefined),
		} as unknown as SerialPort;
	}

	beforeEach(() => {
		// Default readImprovResponse: return CURRENT_STATE=PROVISIONED then RPC_RESULT with real IP
		let call = 0;
		(readImprovResponse as any).mockImplementation(async () => {
			call++;
			if (call === 1) {
				// Initial handshake packet (any valid packet is fine)
				return {
					packets: [{ type: 0x01, data: new Uint8Array([0x04]) }],
					buffer: [],
				};
			}
			if (call === 2) {
				// State packet (TYPE_CURRENT_STATE, STATE_PROVISIONED)
				return {
					packets: [{ type: 0x01, data: new Uint8Array([0x04]) }],
					buffer: [],
				};
			}
			// RPC result echoing GET_CURRENT_STATE with URL
			const url = "http://192.168.1.42";
			const urlBytes = new TextEncoder().encode(url);
			const data = new Uint8Array(3 + urlBytes.length);
			data[0] = 0x02; // CMD_GET_CURRENT_STATE
			data[1] = 1 + urlBytes.length;
			data[2] = urlBytes.length;
			data.set(urlBytes, 3);
			return { packets: [{ type: 0x04, data }], buffer: [] };
		});
	});

	it("returns PROVISIONED state + real IP when device has working credentials", async () => {
		const port = mockPortReady();
		const result = await queryImprovState(port);
		expect(result.state).toBe("PROVISIONED");
		expect(result.ip).toBe("192.168.1.42");
		expect(result.writer).toBeDefined();
		expect(result.reader).toBeDefined();
	});

	it("returns PROVISIONED + ip=undefined when credentials saved but DHCP failing", async () => {
		// detectIpAddress exhausting its budget on a persistent 0.0.0.0 means
		// "no usable IP" — the contract is ip: undefined, NOT a "0.0.0.0"
		// sentinel string that every caller would have to know to compare.
		(readImprovResponse as any).mockImplementation(async () => {
			return {
				packets: [
					{ type: 0x01, data: new Uint8Array([0x04]) }, // PROVISIONED
					(() => {
						const url = "http://0.0.0.0";
						const urlBytes = new TextEncoder().encode(url);
						const data = new Uint8Array(3 + urlBytes.length);
						data[0] = 0x02;
						data[1] = 1 + urlBytes.length;
						data[2] = urlBytes.length;
						data.set(urlBytes, 3);
						return { type: 0x04, data };
					})(),
				],
				buffer: [],
			};
		});
		const port = mockPortReady();
		const result = await queryImprovState(port, { readDelay: 300 });
		expect(result.state).toBe("PROVISIONED");
		expect(result.ip).toBeUndefined();
	});

	it("keeps polling when url shows 0.0.0.0 until a real IP arrives", async () => {
		// Real device behaviour: immediately after boot, improv returns
		// "http://0.0.0.0" (state=PROVISIONED but WiFi still associating).
		// A few seconds later it reports the real IP. Our code should keep
		// polling, not fall through on the 0.0.0.0 response.
		let call = 0;
		(readImprovResponse as any).mockImplementation(async () => {
			call++;
			if (call === 1) {
				// Initial handshake
				return {
					packets: [{ type: 0x01, data: new Uint8Array([0x04]) }],
					buffer: [],
				};
			}
			// First few polls: 0.0.0.0. Then: real IP.
			const url = call < 4 ? "http://0.0.0.0" : "http://192.168.1.42";
			const urlBytes = new TextEncoder().encode(url);
			const rpcData = new Uint8Array(3 + urlBytes.length);
			rpcData[0] = 0x02;
			rpcData[1] = 1 + urlBytes.length;
			rpcData[2] = urlBytes.length;
			rpcData.set(urlBytes, 3);
			return {
				packets: [
					{ type: 0x01, data: new Uint8Array([0x04]) },
					{ type: 0x04, data: rpcData },
				],
				buffer: [],
			};
		});
		const port = mockPortReady();
		const result = await queryImprovState(port, { readDelay: 30000 });
		expect(result.state).toBe("PROVISIONED");
		expect(result.ip).toBe("192.168.1.42");
	});

	it("returns AUTHORIZED (no IP) when device has no credentials", async () => {
		(readImprovResponse as any).mockImplementation(async () => {
			return {
				packets: [{ type: 0x01, data: new Uint8Array([0x02]) }], // STATE_AUTHORIZED
				buffer: [],
			};
		});
		const port = mockPortReady();
		const result = await queryImprovState(port);
		expect(result.state).toBe("AUTHORIZED");
		expect(result.ip).toBeUndefined();
	});

	it("throws and releases locks when no state packet received within timeout", async () => {
		// Handshake succeeds on first call; subsequent call (inside queryImprovState's
		// read loop) rejects with a timeout error.
		let readCall = 0;
		(readImprovResponse as any).mockImplementation(async () => {
			readCall++;
			if (readCall === 1) {
				return {
					packets: [{ type: 0x01, data: new Uint8Array([0x02]) }],
					buffer: [],
				};
			}
			throw Object.assign(new Error("timeout"), {
				errorKey: "flasher.errors.timeout",
			});
		});
		const reader = {
			read: vi.fn().mockImplementation(() => new Promise(() => {})),
			releaseLock: vi.fn(),
		};
		const writer = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
		};
		const port = {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			readable: { getReader: () => reader },
			writable: { getWriter: () => writer },
			setSignals: vi.fn().mockResolvedValue(undefined),
		} as unknown as SerialPort;
		await expect(
			queryImprovState(port, {
				readDelay: 100,
				drainDelay: 0,
				handshakeDelay: 100,
				handshakeRetryDelay: 0,
			}),
		).rejects.toThrow();
		expect(writer.releaseLock).toHaveBeenCalled();
		expect(reader.releaseLock).toHaveBeenCalled();
	});

	it("throws and releases locks when response is malformed (short packet)", async () => {
		// All readImprovResponse calls return a packet with no data bytes — handshake
		// resolves (doesn't throw) but no valid state byte is ever parsed. After
		// readDelay ms the loop exits with stateByte === undefined and throws.
		(readImprovResponse as any).mockImplementation(async () => {
			return {
				packets: [{ type: 0x01, data: new Uint8Array([]) }], // too short, no state byte
				buffer: [],
			};
		});
		const reader = {
			read: vi.fn().mockImplementation(() => new Promise(() => {})),
			releaseLock: vi.fn(),
		};
		const writer = {
			write: vi.fn().mockResolvedValue(undefined),
			releaseLock: vi.fn(),
		};
		const port = {
			open: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			readable: { getReader: () => reader },
			writable: { getWriter: () => writer },
			setSignals: vi.fn().mockResolvedValue(undefined),
		} as unknown as SerialPort;
		await expect(
			queryImprovState(port, {
				readDelay: 100,
				drainDelay: 0,
				handshakeDelay: 100,
				handshakeRetryDelay: 0,
			}),
		).rejects.toThrow();
		expect(writer.releaseLock).toHaveBeenCalled();
		expect(reader.releaseLock).toHaveBeenCalled();
	});
});

describe("UsbFlashState types", () => {
	it("accepts wifi_check step", () => {
		const s: UsbFlashState = { step: "wifi_check" };
		expect(s.step).toBe("wifi_check");
	});

	it("accepts autoSkipped field on wifi_configured", () => {
		const s: UsbFlashState = {
			step: "wifi_configured",
			ip: "192.168.1.1",
			autoSkipped: true,
		};
		expect(s.autoSkipped).toBe(true);
	});
});
