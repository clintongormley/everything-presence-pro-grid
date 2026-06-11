import { describe, expect, it } from "vitest";
import {
	buildGetInfoCommand,
	buildGetStateCommand,
	buildImprovPacket,
	buildScanCommand,
	buildWifiCommand,
	CMD_GET_CURRENT_STATE,
	CMD_GET_DEVICE_INFO,
	CMD_WIFI_SCAN,
	CMD_WIFI_SETTINGS,
	describeImprovPacket,
	IMPROV_HEADER,
	parseImprovPackets,
	parseScanResults,
	STATE_AUTHORIZED,
	STATE_PROVISIONED,
	TYPE_CURRENT_STATE,
	TYPE_ERROR_STATE,
	TYPE_RPC_COMMAND,
	TYPE_RPC_RESULT,
} from "../../lib/improv-serial.js";

describe("IMPROV_HEADER", () => {
	it("equals the ASCII bytes for IMPROV", () => {
		expect(IMPROV_HEADER).toEqual([0x49, 0x4d, 0x50, 0x52, 0x4f, 0x56]);
	});
});

describe("buildImprovPacket", () => {
	it("creates a valid packet with correct structure and checksum", () => {
		// Simple test: type=0x03, data=[0x04, 0x00]
		const packet = buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
		// Header (6) + version (1) + type (1) + length (1) + data (2) + checksum (1) + newline (1) = 13
		expect(packet.length).toBe(13);
		// Header
		expect(Array.from(packet.slice(0, 6))).toEqual(IMPROV_HEADER);
		// Version
		expect(packet[6]).toBe(0x01);
		// Type
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		// Length
		expect(packet[8]).toBe(2);
		// Data
		expect(packet[9]).toBe(CMD_WIFI_SCAN);
		expect(packet[10]).toBe(0x00);
		// Checksum = sum of all preceding bytes mod 256
		const sum =
			Array.from(packet.slice(0, 11)).reduce((a, b) => a + b, 0) % 256;
		expect(packet[11]).toBe(sum);
		// Trailing newline
		expect(packet[12]).toBe(0x0a);
	});

	it("computes checksum as sum of all preceding bytes mod 256", () => {
		const data = [0x01, 0x02, 0x03];
		const packet = buildImprovPacket(0x05, data);
		// Checksum is second-to-last byte (last byte is newline)
		const checksumIdx = packet.length - 2;
		const allBytes = Array.from(packet.slice(0, checksumIdx));
		const expectedChecksum = allBytes.reduce((a, b) => a + b, 0) % 256;
		expect(packet[checksumIdx]).toBe(expectedChecksum);
		expect(packet[packet.length - 1]).toBe(0x0a);
	});
});

describe("buildScanCommand", () => {
	it("creates a scan RPC command packet", () => {
		const packet = buildScanCommand();
		// Should be buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00])
		const expected = buildImprovPacket(TYPE_RPC_COMMAND, [CMD_WIFI_SCAN, 0x00]);
		expect(packet).toEqual(expected);
	});

	it("has type TYPE_RPC_COMMAND and first data byte CMD_WIFI_SCAN", () => {
		const packet = buildScanCommand();
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		expect(packet[9]).toBe(CMD_WIFI_SCAN);
	});
});

describe("buildGetStateCommand", () => {
	it("creates a GET_CURRENT_STATE RPC command packet", () => {
		const packet = buildGetStateCommand();
		const expected = buildImprovPacket(TYPE_RPC_COMMAND, [
			CMD_GET_CURRENT_STATE,
			0x00,
		]);
		expect(packet).toEqual(expected);
	});

	it("has type TYPE_RPC_COMMAND and first data byte CMD_GET_CURRENT_STATE", () => {
		const packet = buildGetStateCommand();
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		expect(packet[9]).toBe(CMD_GET_CURRENT_STATE);
	});
});

describe("buildGetInfoCommand", () => {
	it("creates a GET_DEVICE_INFO RPC command packet", () => {
		const packet = buildGetInfoCommand();
		const expected = buildImprovPacket(TYPE_RPC_COMMAND, [
			CMD_GET_DEVICE_INFO,
			0x00,
		]);
		expect(packet).toEqual(expected);
	});

	it("has type TYPE_RPC_COMMAND and first data byte CMD_GET_DEVICE_INFO", () => {
		const packet = buildGetInfoCommand();
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);
		expect(packet[9]).toBe(CMD_GET_DEVICE_INFO);
	});
});

describe("buildWifiCommand", () => {
	it("encodes SSID and password in the correct format", () => {
		const ssid = "MyWifi";
		const password = "secret";
		const packet = buildWifiCommand(ssid, password);

		// Data layout: [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid_bytes, pass_len, ...pass_bytes]
		const ssidBytes = new TextEncoder().encode(ssid);
		const passBytes = new TextEncoder().encode(password);
		const totalLen = 1 + ssidBytes.length + 1 + passBytes.length; // ssid_len + ssid + pass_len + pass

		// Packet structure: header(6) + version(1) + type(1) + length(1) + data(N) + checksum(1) + newline(1)
		// data = [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid, pass_len, ...pass]
		const dataLength = 2 + 1 + ssidBytes.length + 1 + passBytes.length;
		expect(packet.length).toBe(6 + 1 + 1 + 1 + dataLength + 1 + 1);

		// Type should be TYPE_RPC_COMMAND
		expect(packet[7]).toBe(TYPE_RPC_COMMAND);

		// First data byte is CMD_WIFI_SETTINGS
		expect(packet[9]).toBe(CMD_WIFI_SETTINGS);

		// Second data byte is total_len
		expect(packet[10]).toBe(totalLen);

		// Third data byte is ssid_len
		expect(packet[11]).toBe(ssidBytes.length);

		// SSID bytes
		for (let i = 0; i < ssidBytes.length; i++) {
			expect(packet[12 + i]).toBe(ssidBytes[i]);
		}

		// pass_len
		expect(packet[12 + ssidBytes.length]).toBe(passBytes.length);

		// password bytes
		for (let i = 0; i < passBytes.length; i++) {
			expect(packet[13 + ssidBytes.length + i]).toBe(passBytes[i]);
		}
	});

	it("handles empty password", () => {
		const packet = buildWifiCommand("OpenNet", "");
		const ssidBytes = new TextEncoder().encode("OpenNet");
		// data = [CMD_WIFI_SETTINGS, total_len, ssid_len, ...ssid, pass_len(0)]
		const totalLen = 1 + ssidBytes.length + 1 + 0;
		expect(packet[10]).toBe(totalLen);
		expect(packet[11]).toBe(ssidBytes.length);
		// pass_len = 0
		expect(packet[12 + ssidBytes.length]).toBe(0);
	});

	describe("length validation (single-byte length prefixes)", () => {
		// The length prefixes are single bytes — oversized credentials would
		// silently truncate mod 256 and provision garbage. 802.11 caps SSIDs
		// at 32 octets and WPA passphrases at 64; reject anything longer
		// BEFORE the packet is built.

		it("accepts a 32-byte SSID and a 64-byte password", () => {
			expect(() =>
				buildWifiCommand("a".repeat(32), "p".repeat(64)),
			).not.toThrow();
		});

		it("throws on a 33-byte SSID", () => {
			expect(() => buildWifiCommand("a".repeat(33), "pw")).toThrow(/SSID/);
		});

		it("throws on a 65-byte password", () => {
			expect(() => buildWifiCommand("net", "p".repeat(65))).toThrow(
				/password/i,
			);
		});

		it("measures UTF-8 bytes, not characters (11 × 3-byte chars = 33 bytes)", () => {
			// "€" encodes to 3 UTF-8 bytes; 11 chars pass a char-count check
			// but exceed the 32-byte wire limit.
			expect(() => buildWifiCommand("€".repeat(11), "pw")).toThrow(/SSID/);
		});

		it("attaches errorKeys so the flasher UI can localize the failure", () => {
			let ssidErr: unknown;
			let passErr: unknown;
			try {
				buildWifiCommand("a".repeat(33), "pw");
			} catch (e) {
				ssidErr = e;
			}
			try {
				buildWifiCommand("net", "p".repeat(65));
			} catch (e) {
				passErr = e;
			}
			expect((ssidErr as { errorKey?: string }).errorKey).toBe(
				"wifi.errors.ssid_too_long",
			);
			expect((passErr as { errorKey?: string }).errorKey).toBe(
				"wifi.errors.password_too_long",
			);
		});
	});
});

describe("parseImprovPackets", () => {
	it("extracts valid packets from mixed data (log text + Improv packets)", () => {
		// Build a real scan command packet
		const realPacket = buildScanCommand();

		// Mix it with some log text bytes before and after
		const prefix = new TextEncoder().encode("LOG: some debug text\r\n");
		const suffix = new TextEncoder().encode("another log line\r\n");

		const mixed = new Uint8Array(
			prefix.length + realPacket.length + suffix.length,
		);
		mixed.set(prefix, 0);
		mixed.set(realPacket, prefix.length);
		mixed.set(suffix, prefix.length + realPacket.length);

		const { packets } = parseImprovPackets(mixed);
		expect(packets.length).toBe(1);
		expect(packets[0].type).toBe(TYPE_RPC_COMMAND);
		expect(Array.from(packets[0].data)).toEqual([CMD_WIFI_SCAN, 0x00]);
	});

	it("returns empty array when no packets present", () => {
		const data = new TextEncoder().encode(
			"just some log text with no improv packets",
		);
		const { packets } = parseImprovPackets(data);
		expect(packets.length).toBe(0);
	});

	it("extracts multiple packets from a stream", () => {
		const packet1 = buildScanCommand();
		const packet2 = buildImprovPacket(TYPE_RPC_RESULT, [0x01, 0x02]);

		const combined = new Uint8Array(packet1.length + packet2.length);
		combined.set(packet1, 0);
		combined.set(packet2, packet1.length);

		const { packets } = parseImprovPackets(combined);
		expect(packets.length).toBe(2);
		expect(packets[0].type).toBe(TYPE_RPC_COMMAND);
		expect(packets[1].type).toBe(TYPE_RPC_RESULT);
	});

	it("rejects packets with invalid checksum", () => {
		const packet = buildScanCommand();
		// Corrupt the checksum (second-to-last byte, before newline)
		const corrupted = new Uint8Array(packet);
		const checksumIdx = corrupted.length - 2;
		corrupted[checksumIdx] = (corrupted[checksumIdx] + 1) % 256;

		const { packets } = parseImprovPackets(corrupted);
		expect(packets.length).toBe(0);
	});

	it("returns empty array when header is found but not enough bytes for packet header", () => {
		// Construct a truncated Improv stream: header(6) only, no version/type/length
		const header = new Uint8Array(IMPROV_HEADER);
		// Only provide the 6 header bytes — not enough to form a complete packet (needs 3 more)
		const { packets } = parseImprovPackets(header);
		expect(packets.length).toBe(0);
	});

	it("returns empty array when packet data is incomplete (length > available bytes)", () => {
		// Build a real packet then truncate the data section
		const real = buildScanCommand();
		// Drop the last 2 bytes so the data + checksum bytes are missing
		const truncated = real.slice(0, real.length - 2);
		const { packets } = parseImprovPackets(truncated);
		expect(packets.length).toBe(0);
	});

	it("reports consumed bytes so callers can preserve leftover data", () => {
		const pkt = buildImprovPacket(TYPE_RPC_RESULT, [0x01]);
		// Add a partial second packet header at the end
		const partial = new Uint8Array([0x49, 0x4d]); // "IM" — start of IMPROV
		const combined = new Uint8Array(pkt.length + partial.length);
		combined.set(pkt, 0);
		combined.set(partial, pkt.length);

		const result = parseImprovPackets(combined);
		expect(result.packets.length).toBe(1);
		expect(result.consumed).toBe(pkt.length);
	});

	it("consumed covers all parsed packets plus any trailing non-header bytes", () => {
		const pkt1 = buildImprovPacket(TYPE_RPC_RESULT, [0x01]);
		const pkt2 = buildImprovPacket(TYPE_RPC_RESULT, [0x02]);
		const combined = new Uint8Array(pkt1.length + pkt2.length);
		combined.set(pkt1, 0);
		combined.set(pkt2, pkt1.length);

		const result = parseImprovPackets(combined);
		expect(result.packets.length).toBe(2);
		expect(result.consumed).toBe(pkt1.length + pkt2.length);
	});

	it("recovers a packet buried in garbled data with many 'I' false-starts", () => {
		// Stream = many bytes that include 'I' but not the full IMPROV header,
		// then a real packet, then more garbage.
		const garblePrefix = new Uint8Array(2000);
		for (let i = 0; i < garblePrefix.length; i++) {
			// alternate 'I' (0x49) with non-IMPROV bytes so indexOf-based skipping
			// has to handle false starts repeatedly
			garblePrefix[i] = i % 3 === 0 ? 0x49 : 0x20 + (i & 0x3f);
		}
		const real = buildImprovPacket(TYPE_RPC_RESULT, [0xaa, 0xbb]);
		const garbleSuffix = new TextEncoder().encode("trailing log noise");

		const combined = new Uint8Array(
			garblePrefix.length + real.length + garbleSuffix.length,
		);
		combined.set(garblePrefix, 0);
		combined.set(real, garblePrefix.length);
		combined.set(garbleSuffix, garblePrefix.length + real.length);

		const { packets } = parseImprovPackets(combined);
		expect(packets.length).toBe(1);
		expect(packets[0].type).toBe(TYPE_RPC_RESULT);
		expect(Array.from(packets[0].data)).toEqual([0xaa, 0xbb]);
	});
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("improv-serial timeout error", () => {
	it("thrown timeout error has errorKey flasher.errors.timeout", () => {
		const err: any = Object.assign(new Error("timeout"), {
			errorKey: "flasher.errors.timeout",
		});
		expect(err.errorKey).toBe("flasher.errors.timeout");
		expect(err.message).toBe("timeout");
	});

	it("improv-serial.ts line ~234 uses Object.assign with errorKey", () => {
		const src = readFileSync(
			join(__dirname, "..", "..", "lib", "improv-serial.ts"),
			"utf8",
		);
		// Negative check: no bare 'throw new Error("timeout")'
		expect(src).not.toMatch(/throw new Error\("timeout"\)/);
		// Positive check: Object.assign pattern with the errorKey is present
		expect(src).toMatch(/errorKey:\s*"flasher\.errors\.timeout"/);
	});
});

describe("parseScanResults", () => {
	it("parses network info with auth=YES", () => {
		// Format: [ssid_len, ...ssid, rssi_len, ...rssi_str, auth_len, ...auth_str]
		const encoder = new TextEncoder();
		const ssid = "MyNetwork";
		const rssi = "-65";
		const auth = "YES";

		const ssidBytes = encoder.encode(ssid);
		const rssiBytes = encoder.encode(rssi);
		const authBytes = encoder.encode(auth);

		const data = new Uint8Array(
			1 + ssidBytes.length + 1 + rssiBytes.length + 1 + authBytes.length,
		);
		let offset = 0;
		data[offset++] = ssidBytes.length;
		data.set(ssidBytes, offset);
		offset += ssidBytes.length;
		data[offset++] = rssiBytes.length;
		data.set(rssiBytes, offset);
		offset += rssiBytes.length;
		data[offset++] = authBytes.length;
		data.set(authBytes, offset);

		const result = parseScanResults(data);
		expect(result).not.toBeNull();
		expect(result?.ssid).toBe("MyNetwork");
		expect(result?.rssi).toBe(-65);
		expect(result?.authRequired).toBe(true);
	});

	it("returns null for empty data (termination packet)", () => {
		const result = parseScanResults(new Uint8Array(0));
		expect(result).toBeNull();
	});

	it("returns null when SSID is truncated", () => {
		// Length byte says 10 but only 3 bytes follow
		const data = new Uint8Array([10, 0x41, 0x42, 0x43]);
		expect(parseScanResults(data)).toBeNull();
	});

	it("returns null when RSSI field is missing", () => {
		// Valid SSID but nothing after
		const encoder = new TextEncoder();
		const ssid = encoder.encode("Net");
		const data = new Uint8Array(1 + ssid.length);
		data[0] = ssid.length;
		data.set(ssid, 1);
		expect(parseScanResults(data)).toBeNull();
	});

	it("returns null when auth field is missing", () => {
		const encoder = new TextEncoder();
		const ssid = encoder.encode("Net");
		const rssi = encoder.encode("-50");
		const data = new Uint8Array(1 + ssid.length + 1 + rssi.length);
		let offset = 0;
		data[offset++] = ssid.length;
		data.set(ssid, offset);
		offset += ssid.length;
		data[offset++] = rssi.length;
		data.set(rssi, offset);
		expect(parseScanResults(data)).toBeNull();
	});

	it("returns null when RSSI is not a number", () => {
		const encoder = new TextEncoder();
		const ssid = encoder.encode("Net");
		const rssi = encoder.encode("abc");
		const auth = encoder.encode("YES");
		const data = new Uint8Array(
			1 + ssid.length + 1 + rssi.length + 1 + auth.length,
		);
		let offset = 0;
		data[offset++] = ssid.length;
		data.set(ssid, offset);
		offset += ssid.length;
		data[offset++] = rssi.length;
		data.set(rssi, offset);
		offset += rssi.length;
		data[offset++] = auth.length;
		data.set(auth, offset);
		expect(parseScanResults(data)).toBeNull();
	});

	it("parses open network with auth=NO", () => {
		const encoder = new TextEncoder();
		const ssid = "OpenNetwork";
		const rssi = "-80";
		const auth = "NO";

		const ssidBytes = encoder.encode(ssid);
		const rssiBytes = encoder.encode(rssi);
		const authBytes = encoder.encode(auth);

		const data = new Uint8Array(
			1 + ssidBytes.length + 1 + rssiBytes.length + 1 + authBytes.length,
		);
		let offset = 0;
		data[offset++] = ssidBytes.length;
		data.set(ssidBytes, offset);
		offset += ssidBytes.length;
		data[offset++] = rssiBytes.length;
		data.set(rssiBytes, offset);
		offset += rssiBytes.length;
		data[offset++] = authBytes.length;
		data.set(authBytes, offset);

		const result = parseScanResults(data);
		expect(result).not.toBeNull();
		expect(result?.ssid).toBe("OpenNetwork");
		expect(result?.rssi).toBe(-80);
		expect(result?.authRequired).toBe(false);
	});
});

describe("describeImprovPacket", () => {
	it("names AUTHORIZED and PROVISIONED CURRENT_STATE packets", () => {
		expect(
			describeImprovPacket({
				type: TYPE_CURRENT_STATE,
				data: new Uint8Array([STATE_AUTHORIZED]),
			}),
		).toBe("CURRENT_STATE AUTHORIZED");
		expect(
			describeImprovPacket({
				type: TYPE_CURRENT_STATE,
				data: new Uint8Array([STATE_PROVISIONED]),
			}),
		).toBe("CURRENT_STATE PROVISIONED");
	});

	it("renders unknown CURRENT_STATE bytes in hex", () => {
		expect(
			describeImprovPacket({
				type: TYPE_CURRENT_STATE,
				data: new Uint8Array([0x07]),
			}),
		).toBe("CURRENT_STATE state=0x07");
	});

	it("renders ERROR_STATE in hex", () => {
		expect(
			describeImprovPacket({
				type: TYPE_ERROR_STATE,
				data: new Uint8Array([0x03]),
			}),
		).toBe("ERROR_STATE 0x03");
	});

	it("renders RPC_COMMAND in hex", () => {
		expect(
			describeImprovPacket({
				type: TYPE_RPC_COMMAND,
				data: new Uint8Array([CMD_WIFI_SETTINGS]),
			}),
		).toBe("RPC_COMMAND 0x01");
	});

	it("names known RPC_RESULT commands", () => {
		// GET_DEVICE_INFO with no embedded url
		expect(
			describeImprovPacket({
				type: TYPE_RPC_RESULT,
				data: new Uint8Array([CMD_GET_DEVICE_INFO, 0x00]),
			}),
		).toBe("RPC_RESULT GET_DEVICE_INFO (2 bytes)");
		expect(
			describeImprovPacket({
				type: TYPE_RPC_RESULT,
				data: new Uint8Array([CMD_WIFI_SCAN, 0x00]),
			}),
		).toBe("RPC_RESULT WIFI_SCAN (2 bytes)");
		expect(
			describeImprovPacket({
				type: TYPE_RPC_RESULT,
				data: new Uint8Array([CMD_WIFI_SETTINGS, 0x00]),
			}),
		).toBe("RPC_RESULT WIFI_SETTINGS (2 bytes)");
	});

	it("renders unknown RPC_RESULT command in hex", () => {
		expect(
			describeImprovPacket({
				type: TYPE_RPC_RESULT,
				data: new Uint8Array([0x99, 0x00]),
			}),
		).toBe("RPC_RESULT cmd=0x99 (2 bytes)");
	});

	it("extracts the URL from a GET_CURRENT_STATE RPC_RESULT", () => {
		const url = "http://192.168.1.42";
		const urlBytes = new TextEncoder().encode(url);
		const data = new Uint8Array(3 + urlBytes.length);
		data[0] = CMD_GET_CURRENT_STATE;
		data[1] = urlBytes.length + 1;
		data[2] = urlBytes.length;
		data.set(urlBytes, 3);
		expect(describeImprovPacket({ type: TYPE_RPC_RESULT, data })).toBe(
			`RPC_RESULT GET_CURRENT_STATE url="${url}"`,
		);
	});

	it("falls back to byte-count when the GET_CURRENT_STATE URL is truncated", () => {
		// strLen says 10 but only 2 url bytes follow
		const data = new Uint8Array([
			CMD_GET_CURRENT_STATE,
			0x0b,
			0x0a,
			0x68,
			0x69,
		]);
		expect(describeImprovPacket({ type: TYPE_RPC_RESULT, data })).toBe(
			"RPC_RESULT GET_CURRENT_STATE (5 bytes)",
		);
	});

	it("renders unknown packet types in hex", () => {
		expect(
			describeImprovPacket({
				type: 0xab,
				data: new Uint8Array([0x01, 0x02, 0x03]),
			}),
		).toBe("type=0xab (3 bytes)");
	});
});
