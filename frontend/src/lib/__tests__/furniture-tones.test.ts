import { describe, expect, it, vi } from "vitest";
import type { FurnitureItem } from "../furniture.js";
import { FURNITURE_TONE_CSS } from "../furniture-contrast.js";
import { computeFurnitureTones } from "../furniture-tones.js";

const item = (over: Partial<FurnitureItem> = {}): FurnitureItem => ({
	id: "f1",
	type: "svg",
	icon: "bath",
	label: "Bath",
	x: 300,
	y: 300,
	width: 300,
	height: 300,
	rotation: 0,
	lockAspect: false,
	...over,
});

describe("computeFurnitureTones", () => {
	it("picks light over a dark cell and dark over a light cell", () => {
		const dark = computeFurnitureTones([item()], 4200, 5100, () => [
			17, 20, 24,
		]);
		expect(dark.get("f1")).toEqual(FURNITURE_TONE_CSS.light);
		const light = computeFurnitureTones([item()], 4200, 5100, () => [
			191, 224, 245,
		]);
		expect(light.get("f1")).toEqual(FURNITURE_TONE_CSS.dark);
	});
	it("omits an item whose cell is unreadable", () => {
		expect(
			computeFurnitureTones([item()], 4200, 5100, () => null).has("f1"),
		).toBe(false);
	});
	it("omits an item whose centre is off-grid", () => {
		expect(
			computeFurnitureTones([item({ x: 999999 })], 4200, 5100, () => [
				0, 0, 0,
			]).has("f1"),
		).toBe(false);
	});
	it("reads a cell per item", () => {
		const read = vi.fn(() => [0, 0, 0] as [number, number, number]);
		computeFurnitureTones(
			[item(), item({ id: "f2", x: 600, y: 600 })],
			4200,
			5100,
			read,
		);
		expect(read).toHaveBeenCalledTimes(2);
	});
});
