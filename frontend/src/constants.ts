import type { FurnitureSticker } from "./lib/furniture.js";
import { MAX_RANGE } from "./lib/grid.js";

// Top-down floor plan SVGs from frontend/images/
export const FLOOR_PLAN_SVGS: Record<
	string,
	{ viewBox: string; content: string }
> = {
	armchair: {
		viewBox: "0 0 256 256",
		content: `<rect x="16" y="16" width="224" height="224" rx="16" stroke="black" stroke-width="12" fill="none"/><rect x="16" y="16" width="224" height="48" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="16" y="64" width="48" height="176" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="192" y="64" width="48" height="176" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="64" y="64" width="128" height="176" rx="8" stroke="black" stroke-width="8" fill="none"/>`,
	},
	bath: {
		viewBox: "0 0 600 300",
		content: `<rect x="50" y="50" width="500" height="200" rx="40" stroke="black" stroke-width="8" fill="none"/><path d="M 100 220 C 100 240, 500 240, 500 220" stroke="black" stroke-width="8" fill="none"/><rect x="70" y="70" width="30" height="20" stroke="black" stroke-width="8" fill="none"/><rect x="80" y="90" width="10" height="20" stroke="black" stroke-width="8" fill="none"/><circle cx="510" cy="150" r="10" stroke="black" stroke-width="8" fill="none"/>`,
	},
	"bed-double": {
		viewBox: "0 0 512 512",
		content: `<rect x="0" y="0" width="512" height="512" rx="16" stroke="black" stroke-width="16" fill="none"/><path d="M0 64C0 46.3269 16.3269 32 32 32H480C497.673 32 512 46.3269 512 64V128C512 145.673 497.673 160 480 160H32C16.3269 160 0 145.673 0 128V64Z" stroke="black" stroke-width="16" fill="none"/><rect x="32" y="32" width="208" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="272" y="32" width="208" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="16" y="144" width="480" height="336" rx="8" stroke="black" stroke-width="16" fill="none"/><line x1="16" y1="256" x2="496" y2="256" stroke="#D0D0D0" stroke-width="8"/><line x1="16" y1="368" x2="496" y2="368" stroke="#D0D0D0" stroke-width="8"/>`,
	},
	"bed-single": {
		viewBox: "0 0 256 512",
		content: `<rect x="0" y="0" width="256" height="512" rx="16" stroke="black" stroke-width="16" fill="none"/><path d="M0 64C0 46.3269 16.3269 32 32 32H224C241.673 32 256 46.3269 256 64V128C256 145.673 241.673 160 224 160H32C16.3269 160 0 145.673 0 128V64Z" stroke="black" stroke-width="16" fill="none"/><rect x="32" y="32" width="192" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="16" y="144" width="224" height="336" rx="8" stroke="black" stroke-width="16" fill="none"/><line x1="16" y1="256" x2="240" y2="256" stroke="#D0D0D0" stroke-width="8"/><line x1="16" y1="368" x2="240" y2="368" stroke="#D0D0D0" stroke-width="8"/>`,
	},
	"door-left": {
		viewBox: "0 0 256 256",
		content: `<rect x="0" y="210" width="80" height="20" fill="black"/><rect x="60" y="60" width="20" height="150" fill="black"/><rect x="200" y="210" width="56" height="20" fill="black"/><path d="M 80 60 A 150 150 0 0 1 200 210" stroke="black" stroke-width="3" fill="none"/>`,
	},
	"door-right": {
		viewBox: "0 0 256 256",
		content: `<rect x="176" y="210" width="80" height="20" fill="black"/><rect x="176" y="60" width="20" height="150" fill="black"/><rect x="0" y="210" width="56" height="20" fill="black"/><path d="M 176 60 A 150 150 0 0 0 56 210" stroke="black" stroke-width="3" fill="none"/>`,
	},
	"floor-lamp": {
		viewBox: "0 0 256 256",
		content: `<circle cx="128" cy="128" r="96" stroke="black" stroke-width="16" fill="none"/><circle cx="128" cy="128" r="80" stroke="black" stroke-width="8" fill="none"/><circle cx="128" cy="128" r="16" fill="black"/><line x1="128" y1="112" x2="128" y2="48" stroke="black" stroke-width="8"/><circle cx="128" cy="48" r="8" fill="black"/><path d="M 64 64 A 128 128 0 0 1 192 64" stroke="black" stroke-width="8" stroke-dasharray="8 8"/>`,
	},
	oven: {
		viewBox: "0 0 256 256",
		content: `<rect x="0" y="0" width="256" height="256" rx="16" stroke="black" stroke-width="16" fill="none"/><line x1="0" y1="224" x2="256" y2="224" stroke="black" stroke-width="16"/><circle cx="64" cy="64" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="64" cy="64" r="16" fill="black"/><circle cx="192" cy="64" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="192" cy="64" r="16" fill="black"/><circle cx="64" cy="192" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="64" cy="192" r="16" fill="black"/><circle cx="192" cy="192" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="192" cy="192" r="16" fill="black"/><rect x="32" y="240" width="192" height="16" rx="4" stroke="black" stroke-width="8" fill="black"/>`,
	},
	plant: {
		viewBox: "0 0 256 256",
		content: `<circle cx="128" cy="128" r="96" stroke="black" stroke-width="16" fill="none"/><circle cx="128" cy="128" r="80" fill="none"/><g transform="translate(128 128)"><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(72)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(144)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(216)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(288)" fill="none" stroke="black" stroke-width="12"/></g>`,
	},
	shower: {
		viewBox: "0 0 256 256",
		content: `<path d="M 32 32 H 224 V 224 H 32 Z" stroke="black" stroke-width="16" fill="none"/><line x1="32" y1="32" x2="224" y2="224" stroke="black" stroke-width="8" stroke-dasharray="8 8"/><line x1="224" y1="32" x2="32" y2="224" stroke="black" stroke-width="8" stroke-dasharray="8 8"/><circle cx="128" cy="200" r="16" stroke="black" stroke-width="16" fill="none"/>`,
	},
	"sofa-two-seater": {
		viewBox: "0 0 400 200",
		content: `<rect x="8" y="8" width="384" height="184" rx="12" stroke="black" stroke-width="10" fill="none"/><rect x="8" y="8" width="384" height="48" rx="8" stroke="black" stroke-width="10" fill="none"/><rect x="24" y="56" width="172" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="204" y="56" width="172" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/>`,
	},
	"sofa-three-seater": {
		viewBox: "0 0 560 200",
		content: `<rect x="8" y="8" width="544" height="184" rx="12" stroke="black" stroke-width="10" fill="none"/><rect x="8" y="8" width="544" height="48" rx="8" stroke="black" stroke-width="10" fill="none"/><rect x="24" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="200" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="376" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/>`,
	},
	"table-dining-room": {
		viewBox: "0 0 600 400",
		content: `<rect x="150" y="100" width="300" height="200" stroke="black" stroke-width="8" fill="none" rx="10"/><rect x="80" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="460" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="175" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="325" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="175" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="325" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/>`,
	},
	"table-dining-room-round": {
		viewBox: "0 0 400 400",
		content: `<circle cx="200" cy="200" r="100" stroke="black" stroke-width="8" fill="none"/><rect x="150" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="150" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="30" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="310" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/>`,
	},
	television: {
		viewBox: "0 0 256 64",
		content: `<line x1="0" y1="56" x2="256" y2="56" stroke="black" stroke-width="16"/><rect x="32" y="16" width="192" height="40" rx="4" stroke="black" stroke-width="16" fill="none"/><rect x="40" y="24" width="176" height="24" rx="2" stroke="black" stroke-width="8" fill="none"/>`,
	},
	toilet: {
		viewBox: "0 0 300 400",
		content: `<rect x="75" y="30" width="150" height="80" rx="10" stroke="black" stroke-width="8" fill="none"/><path d="M 75 110 C 75 110, 50 160, 50 210 C 50 310, 125 360, 150 360 C 175 360, 250 310, 250 210 C 250 160, 225 110, 225 110 Z" stroke="black" stroke-width="8" fill="none"/><path d="M 100 150 C 100 150, 75 190, 75 220 C 75 300, 125 340, 150 340 C 175 340, 225 300, 225 220 C 225 190, 200 150, 200 150 Z" stroke="black" stroke-width="8" fill="none"/><circle cx="150" cy="70" r="15" stroke="black" stroke-width="8" fill="none"/>`,
	},
};

export const FURNITURE_CATALOG: FurnitureSticker[] = [
	// Floor plan SVGs (top-down, independently scalable)
	{
		type: "svg",
		icon: "armchair",
		label: "furniture.armchair",
		defaultWidth: 800,
		defaultHeight: 800,
	},
	{
		type: "svg",
		icon: "bath",
		label: "furniture.bath",
		defaultWidth: 1700,
		defaultHeight: 700,
	},
	{
		type: "svg",
		icon: "bed-double",
		label: "furniture.double_bed",
		defaultWidth: 1600,
		defaultHeight: 2000,
	},
	{
		type: "svg",
		icon: "bed-single",
		label: "furniture.single_bed",
		defaultWidth: 900,
		defaultHeight: 2000,
	},
	{
		type: "svg",
		icon: "door-left",
		label: "furniture.door_left_swing",
		defaultWidth: 800,
		defaultHeight: 800,
	},
	{
		type: "svg",
		icon: "door-right",
		label: "furniture.door_right_swing",
		defaultWidth: 800,
		defaultHeight: 800,
	},
	{
		type: "svg",
		icon: "table-dining-room",
		label: "furniture.dining_table",
		defaultWidth: 1600,
		defaultHeight: 900,
	},
	{
		type: "svg",
		icon: "table-dining-room-round",
		label: "furniture.round_table",
		defaultWidth: 1000,
		defaultHeight: 1000,
	},
	{
		type: "svg",
		icon: "floor-lamp",
		label: "furniture.lamp",
		defaultWidth: 400,
		defaultHeight: 400,
	},
	{
		type: "svg",
		icon: "oven",
		label: "furniture.oven_stove",
		defaultWidth: 600,
		defaultHeight: 600,
	},
	{
		type: "svg",
		icon: "plant",
		label: "furniture.plant",
		defaultWidth: 400,
		defaultHeight: 400,
	},
	{
		type: "svg",
		icon: "shower",
		label: "furniture.shower",
		defaultWidth: 900,
		defaultHeight: 900,
	},
	{
		type: "svg",
		icon: "sofa-two-seater",
		label: "furniture.sofa_2_seat",
		defaultWidth: 1600,
		defaultHeight: 800,
	},
	{
		type: "svg",
		icon: "sofa-three-seater",
		label: "furniture.sofa_3_seat",
		defaultWidth: 2400,
		defaultHeight: 800,
	},
	{
		type: "svg",
		icon: "television",
		label: "furniture.tv",
		defaultWidth: 1200,
		defaultHeight: 200,
	},
	{
		type: "svg",
		icon: "toilet",
		label: "furniture.toilet",
		defaultWidth: 400,
		defaultHeight: 700,
	},
	// MDI icons (front-view, aspect-locked)
	{
		type: "icon",
		icon: "mdi:countertop",
		label: "furniture.counter",
		defaultWidth: 2000,
		defaultHeight: 600,
		lockAspect: false,
	},
	{
		type: "icon",
		icon: "mdi:cupboard",
		label: "furniture.cupboard",
		defaultWidth: 1000,
		defaultHeight: 500,
		lockAspect: false,
	},
	{
		type: "icon",
		icon: "mdi:desk",
		label: "furniture.desk",
		defaultWidth: 1400,
		defaultHeight: 700,
		lockAspect: false,
	},
	{
		type: "icon",
		icon: "mdi:fridge",
		label: "furniture.fridge",
		defaultWidth: 700,
		defaultHeight: 700,
		lockAspect: true,
	},
	{
		type: "icon",
		icon: "mdi:speaker",
		label: "furniture.speaker",
		defaultWidth: 300,
		defaultHeight: 300,
		lockAspect: true,
	},
	{
		type: "icon",
		icon: "mdi:window-open-variant",
		label: "furniture.window",
		defaultWidth: 1000,
		defaultHeight: 150,
		lockAspect: false,
	},
];

export const CORNER_LABELS = [
	"corners.front_left",
	"corners.front_right",
	"corners.back_right",
	"corners.back_left",
];

export const CORNER_OFFSET_LABELS: [string, string][] = [
	["corners.left_wall", "corners.front_wall"],
	["corners.right_wall", "corners.front_wall"],
	["corners.right_wall", "corners.back_wall"],
	["corners.left_wall", "corners.back_wall"],
];

// Corner capture duration (seconds)
export const CAPTURE_DURATION_S = 5;

// Target dot colors (1 per target, high contrast)
export const TARGET_COLORS = ["#2196F3", "#FF5722", "#4CAF50"]; // blue, red-orange, green

export const DEBUG_LOG_MAX = 100;

// FOV geometry constants (120° wedge)
export const FOV_HALF_ANGLE = Math.PI / 3; // 60°
export const FOV_X_EXTENT = MAX_RANGE * Math.sin(Math.PI / 3); // ~5196
