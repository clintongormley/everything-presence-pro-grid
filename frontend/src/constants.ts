import { html } from "lit";
import type { FurnitureSticker } from "./lib/furniture.js";
import { MAX_RANGE } from "./lib/grid.js";

// Everything Presence Pro Grid logo, inlined from custom_components/eppgrid/
// brand/icon.svg so it ships in the bundle (no extra static path / request).
// Sized via the .epp-logo CSS rule; viewBox preserved for crisp scaling.
export const EPP_LOGO = html`
	<svg
		class="epp-logo"
		viewBox="0 0 256 256"
		role="img"
		aria-label="Everything Presence Pro Grid"
	>
		<rect width="256" height="256" rx="48" fill="#0f172a" />
		<g stroke="#4d6d9f" stroke-width="3">
			<path
				d="M32 32v192M64 32v192M96 32v192M128 32v192M160 32v192M192 32v192M224 32v192"
			/>
			<path
				d="M32 32h192M32 64h192M32 96h192M32 128h192M32 160h192M32 192h192M32 224h192"
			/>
		</g>
		<path
			d="M 128 48 L 32 195.5 A 176 176 0 0 0 224 195.5 Z"
			fill="#0ea5e9"
			fill-opacity="0.32"
			stroke="#7dd3fc"
			stroke-width="3.5"
			stroke-linejoin="round"
		/>
		<g
			fill="none"
			stroke="#7dd3fc"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-dasharray="0 6"
			opacity="0.85"
		>
			<path d="M 96 97.17 A 58.67 58.67 0 0 0 160 97.17" />
			<path d="M 64 146.34 A 117.33 117.33 0 0 0 192 146.34" />
		</g>
		<circle cx="128" cy="160" r="12" fill="#fb923c" />
		<circle
			cx="128"
			cy="160"
			r="22"
			fill="none"
			stroke="#fb923c"
			stroke-width="3"
			opacity="0.6"
		/>
		<circle cx="128" cy="48" r="12" fill="#f8fafc" />
		<circle
			cx="128"
			cy="48"
			r="20"
			fill="none"
			stroke="#f8fafc"
			stroke-width="2.5"
			opacity="0.55"
		/>
	</svg>
`;

// Top-down floor plan SVGs from frontend/images/
export const FLOOR_PLAN_SVGS: Record<
	string,
	{ viewBox: string; content: string }
> = {
	armchair: {
		viewBox: "4 4 92 82",
		content: `<path d="M 15,10 Q 15,5 20,5 L 80,5 Q 85,5 85,10 L 85,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 80,15 L 80,85 L 90,85 Q 95,85 95,80 L 95,20 Q 95,15 90,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/>`,
	},
	car: {
		viewBox: "-1 4 82 152",
		content: `<rect x="8" y="5" width="64" height="150" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><path d="M 14,35 L 14,50 Q 14,55 20,55 L 60,55 Q 66,55 66,50 L 66,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 14,125 L 14,115 Q 14,110 20,110 L 60,110 Q 66,110 66,115 L 66,125" stroke="black" stroke-width="1.5" fill="none"/><rect x="14" y="55" width="52" height="55" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><ellipse cx="4" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><ellipse cx="76" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="2" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="2" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><circle cx="22" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="58" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/>`,
	},
	carpet: {
		viewBox: "4 0.25 132 89.5",
		content: `<rect x="5" y="5" width="130" height="80" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="110" height="60" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><line x1="15" y1="5" x2="15" y2="1" stroke="black" stroke-width="1.5"/><line x1="25" y1="5" x2="25" y2="1" stroke="black" stroke-width="1.5"/><line x1="35" y1="5" x2="35" y2="1" stroke="black" stroke-width="1.5"/><line x1="45" y1="5" x2="45" y2="1" stroke="black" stroke-width="1.5"/><line x1="55" y1="5" x2="55" y2="1" stroke="black" stroke-width="1.5"/><line x1="65" y1="5" x2="65" y2="1" stroke="black" stroke-width="1.5"/><line x1="75" y1="5" x2="75" y2="1" stroke="black" stroke-width="1.5"/><line x1="85" y1="5" x2="85" y2="1" stroke="black" stroke-width="1.5"/><line x1="95" y1="5" x2="95" y2="1" stroke="black" stroke-width="1.5"/><line x1="105" y1="5" x2="105" y2="1" stroke="black" stroke-width="1.5"/><line x1="115" y1="5" x2="115" y2="1" stroke="black" stroke-width="1.5"/><line x1="125" y1="5" x2="125" y2="1" stroke="black" stroke-width="1.5"/><line x1="15" y1="85" x2="15" y2="89" stroke="black" stroke-width="1.5"/><line x1="25" y1="85" x2="25" y2="89" stroke="black" stroke-width="1.5"/><line x1="35" y1="85" x2="35" y2="89" stroke="black" stroke-width="1.5"/><line x1="45" y1="85" x2="45" y2="89" stroke="black" stroke-width="1.5"/><line x1="55" y1="85" x2="55" y2="89" stroke="black" stroke-width="1.5"/><line x1="65" y1="85" x2="65" y2="89" stroke="black" stroke-width="1.5"/><line x1="75" y1="85" x2="75" y2="89" stroke="black" stroke-width="1.5"/><line x1="85" y1="85" x2="85" y2="89" stroke="black" stroke-width="1.5"/><line x1="95" y1="85" x2="95" y2="89" stroke="black" stroke-width="1.5"/><line x1="105" y1="85" x2="105" y2="89" stroke="black" stroke-width="1.5"/><line x1="115" y1="85" x2="115" y2="89" stroke="black" stroke-width="1.5"/><line x1="125" y1="85" x2="125" y2="89" stroke="black" stroke-width="1.5"/>`,
	},
	"cat-bed": {
		viewBox: "4 4 62 62",
		content: `<circle cx="35" cy="35" r="30" stroke="black" stroke-width="2" fill="none"/><circle cx="35" cy="35" r="20" stroke="black" stroke-width="2" fill="none"/><path d="M 38,30 Q 45,28 44,35 Q 43,42 35,41 Q 28,40 30,34" stroke="black" stroke-width="1.5" fill="none"/><path d="M 36,28 L 38,23 L 41,27" stroke="black" stroke-width="1.5" fill="none"/>`,
	},
	"ceiling-fan": {
		viewBox: "6.8107 5.5095 86.3786 83.5837",
		content: `<g transform="translate(50,50)"><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(72)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(144)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(216)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(288)" stroke="black" stroke-width="2" fill="none"/></g><circle cx="50" cy="50" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="1.5" fill="black" stroke="none"/>`,
	},
	"dog-bed": {
		viewBox: "4 4 92 72",
		content: `<ellipse cx="50" cy="40" rx="45" ry="35" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="32" ry="22" stroke="black" stroke-width="2" fill="none"/><circle cx="46" cy="36" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="40" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="47" cy="27" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="53" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/>`,
	},
	bath: {
		viewBox: "4 4 192 82",
		content: `<rect x="5" y="5" width="190" height="80" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="170" height="60" rx="14" ry="14" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="38" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="52" r="5" stroke="black" stroke-width="2" fill="none"/><rect x="28" y="40" width="8" height="10" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="1.5" fill="black" stroke="none"/>`,
	},
	"bed-double": {
		viewBox: "4 4 142 192",
		content: `<rect x="5" y="5" width="140" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="140" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><rect x="80" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="135" y2="70" stroke="black" stroke-width="2"/>`,
	},
	"bed-single": {
		viewBox: "4 4 82 192",
		content: `<rect x="5" y="5" width="80" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="80" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="66" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="75" y2="70" stroke="black" stroke-width="2"/>`,
	},
	"door-left": {
		viewBox: "-2.5 9.75 105 89.75",
		content: `<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="7" y1="97" x2="7" y2="11" stroke="black" stroke-width="2.5"/><path d="M 7,11 A 86,86 0 0,1 93,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>`,
	},
	"door-right": {
		viewBox: "-2.5 9.75 105 89.75",
		content: `<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="93" y2="11" stroke="black" stroke-width="2.5"/><path d="M 93,11 A 86,86 0 0,0 7,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>`,
	},
	"hot-tub": {
		viewBox: "7 7 86 86",
		content: `<circle cx="50" cy="50" r="42" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="35" stroke="black" stroke-width="2" fill="none"/><path d="M 30,40 Q 33,36 36,40 Q 39,44 42,40" stroke="black" stroke-width="1.5" fill="none"/><path d="M 50,35 Q 53,31 56,35 Q 59,39 62,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 38,55 Q 41,51 44,55 Q 47,59 50,55" stroke="black" stroke-width="1.5" fill="none"/><path d="M 56,50 Q 59,46 62,50 Q 65,54 68,50" stroke="black" stroke-width="1.5" fill="none"/><circle cx="50" cy="15" r="2" fill="black" stroke="none"/><circle cx="50" cy="85" r="2" fill="black" stroke="none"/><circle cx="15" cy="50" r="2" fill="black" stroke="none"/><circle cx="85" cy="50" r="2" fill="black" stroke="none"/>`,
	},
	"floor-lamp": {
		viewBox: "7 1 34 56",
		content: `<path d="M 8,56 Q 18,52 28,56" stroke="black" stroke-width="2" fill="none"/><line x1="18" y1="54" x2="18" y2="12" stroke="black" stroke-width="2"/><path d="M 18,12 Q 18,6 24,6 L 30,6" stroke="black" stroke-width="2" fill="none"/><rect x="24" y="2" width="16" height="14" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>`,
	},
	oven: {
		viewBox: "4 4 92 92",
		content: `<rect x="5" y="5" width="90" height="90" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/>`,
	},
	plant: {
		viewBox: "4.25 4.25 51.5 51.5",
		content: `<circle cx="30" cy="30" r="25" stroke="black" stroke-width="1.5" fill="none"/><g transform="translate(30,30)"><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(72)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(144)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(216)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(288)" stroke="black" stroke-width="1.5" fill="none"/></g>`,
	},
	pool: {
		viewBox: "4 4 172 92",
		content: `<rect x="5" y="5" width="170" height="90" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="12" width="156" height="76" rx="16" ry="16" stroke="black" stroke-width="2" fill="none"/><line x1="25" y1="30" x2="155" y2="30" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="50" x2="155" y2="50" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="70" x2="155" y2="70" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><path d="M 20,12 L 20,25 L 35,25 L 35,18 L 28,18 L 28,12" stroke="black" stroke-width="1.5" fill="none"/>`,
	},
	shower: {
		viewBox: "4 4 92 92",
		content: `<rect x="5" y="5" width="90" height="90" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="9" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="2" fill="black" stroke="none"/>`,
	},
	"sofa-two-seater": {
		viewBox: "4 4 152 82",
		content: `<path d="M 15,10 Q 15,5 20,5 L 140,5 Q 145,5 145,10 L 145,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 140,15 L 140,85 L 150,85 Q 155,85 155,80 L 155,20 Q 155,15 150,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="120" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/>`,
	},
	"sofa-three-seater": {
		viewBox: "4 4 212 82",
		content: `<path d="M 15,10 Q 15,5 20,5 L 200,5 Q 205,5 205,10 L 205,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 200,15 L 200,85 L 210,85 Q 215,85 215,80 L 215,20 Q 215,15 210,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="180" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/><line x1="140" y1="28" x2="140" y2="82" stroke="black" stroke-width="2"/>`,
	},
	"table-dining-room": {
		viewBox: "7 4 166 112",
		content: `<rect x="35" y="28" width="110" height="64" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="156" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>`,
	},
	"table-dining-room-round": {
		viewBox: "7 7 106 106",
		content: `<circle cx="60" cy="60" r="30" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="8" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="98" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>`,
	},
	television: {
		viewBox: "4 1 152 17",
		content: `<rect x="5" y="2" width="150" height="8" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="60" y="10" width="40" height="7" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>`,
	},
	"bedside-table": {
		viewBox: "4 4 42 42",
		content: `<rect x="5" y="5" width="40" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="25" x2="45" y2="25" stroke="black" stroke-width="2"/>`,
	},
	bidet: {
		viewBox: "9 9 62 82",
		content: `<ellipse cx="40" cy="50" rx="30" ry="40" stroke="black" stroke-width="2" fill="none"/><ellipse cx="40" cy="53" rx="20" ry="28" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="1.5" fill="black" stroke="none"/>`,
	},
	cabinet: {
		viewBox: "4 4 72 32",
		content: `<rect x="5" y="5" width="70" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="8" y1="15" x2="72" y2="15" stroke="black" stroke-width="1" stroke-dasharray="3 2"/><line x1="8" y1="25" x2="72" y2="25" stroke="black" stroke-width="1" stroke-dasharray="3 2"/>`,
	},
	counter: {
		viewBox: "4 4 192 32",
		content: `<rect x="5" y="5" width="190" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>`,
	},
	cupboard: {
		viewBox: "4 4 92 42",
		content: `<rect x="5" y="5" width="90" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="50" y1="5" x2="50" y2="45" stroke="black" stroke-width="2"/><circle cx="43" cy="25" r="2" fill="black" stroke="none"/><circle cx="57" cy="25" r="2" fill="black" stroke="none"/>`,
	},
	desk: {
		viewBox: "4 4 132 87.2485",
		content: `<rect x="30" y="64" width="66" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><line x1="33" y1="78" x2="30" y2="86" stroke="black" stroke-width="2"/><line x1="93" y1="78" x2="96" y2="86" stroke="black" stroke-width="2"/><path d="M 30,86 Q 63,94 96,86" stroke="black" stroke-width="2.5" fill="none"/><rect x="5" y="5" width="130" height="55" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="12" width="42" height="12" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="26" width="42" height="26" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="45" y1="32" x2="77" y2="32" stroke="black" stroke-width="1"/><line x1="45" y1="37" x2="77" y2="37" stroke="black" stroke-width="1"/><line x1="45" y1="42" x2="77" y2="42" stroke="black" stroke-width="1"/><rect x="54" y="44" width="14" height="6" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><circle cx="110" cy="22" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="110" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/>`,
	},
	fridge: {
		viewBox: "4 4 62 62",
		content: `<rect x="5" y="5" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="9" y="9" width="52" height="52" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="14" y1="22" x2="14" y2="48" stroke="black" stroke-width="2.5"/><circle cx="57" cy="20" r="1.5" fill="black" stroke="none"/><circle cx="57" cy="50" r="1.5" fill="black" stroke="none"/>`,
	},
	"kitchen-island": {
		viewBox: "4 4 192 72",
		content: `<rect x="5" y="5" width="190" height="70" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="35" width="35" height="25" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="3" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="1" fill="black" stroke="none"/><circle cx="16" cy="32" r="3" stroke="black" stroke-width="2" fill="none"/><path d="M 16,32 Q 28,32 28,42" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/>`,
	},
	"side-table": {
		viewBox: "7.2513 3.5 39.4975 40.5",
		content: `<circle cx="27" cy="25" r="18" stroke="black" stroke-width="2" fill="none"/><path d="M 21,8 Q 27,1 33,8" stroke="black" stroke-width="2" fill="none"/><path d="M 9,28 Q 6,37 15,39" stroke="black" stroke-width="2" fill="none"/><path d="M 39,39 Q 48,37 45,28" stroke="black" stroke-width="2" fill="none"/>`,
	},
	"sliding-door": {
		viewBox: "-2.5 4.75 105 10.5",
		content: `<line x1="0" y1="10" x2="8" y2="10" stroke="black" stroke-width="5"/><line x1="92" y1="10" x2="100" y2="10" stroke="black" stroke-width="5"/><line x1="8" y1="6" x2="52" y2="6" stroke="black" stroke-width="2.5"/><line x1="48" y1="14" x2="92" y2="14" stroke="black" stroke-width="2.5"/>`,
	},
	speaker: {
		viewBox: "2.25 2.25 25.5 35.5",
		content: `<rect x="3" y="3" width="24" height="34" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="8" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="1.5" fill="black" stroke="none"/>`,
	},
	"washing-machine": {
		viewBox: "4 4 72 72",
		content: `<rect x="5" y="5" width="70" height="70" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="20" x2="75" y2="20" stroke="black" stroke-width="2"/><circle cx="22" cy="13" r="5" stroke="black" stroke-width="2" fill="none"/><line x1="22" y1="13" x2="22" y2="9" stroke="black" stroke-width="1.5"/><circle cx="55" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="65" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="40" cy="48" r="20" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="48" r="14" stroke="black" stroke-width="2" fill="none"/>`,
	},
	window: {
		viewBox: "-1 1 102 12",
		content: `<line x1="0" y1="2" x2="100" y2="2" stroke="black" stroke-width="2"/><line x1="0" y1="12" x2="100" y2="12" stroke="black" stroke-width="2"/><line x1="0" y1="7" x2="100" y2="7" stroke="black" stroke-width="1"/><line x1="50" y1="2" x2="50" y2="12" stroke="black" stroke-width="1.5"/>`,
	},
	toilet: {
		viewBox: "17 3 66 103",
		content: `<rect x="18" y="4" width="64" height="24" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="22" y="7" width="56" height="18" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="16" rx="6" ry="4" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="2.5" fill="black" stroke="none"/><circle cx="70" cy="30" r="2.5" fill="black" stroke="none"/><path d="M 20,32 L 20,60 Q 20,100 50,105 Q 80,100 80,60 L 80,32" stroke="black" stroke-width="2" fill="none"/><path d="M 24,34 L 24,58 Q 24,94 50,99 Q 76,94 76,58 L 76,34" stroke="black" stroke-width="2" fill="none"/><path d="M 32,40 L 32,58 Q 32,86 50,90 Q 68,86 68,58 L 68,40 Q 68,36 50,36 Q 32,36 32,40 Z" stroke="black" stroke-width="2" fill="none"/><line x1="24" y1="34" x2="76" y2="34" stroke="black" stroke-width="2"/>`,
	},
	washbasin: {
		viewBox: "4 4 92 62",
		content: `<rect x="5" y="5" width="90" height="60" rx="8" ry="8" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="35" ry="20" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="12" r="3.5" stroke="black" stroke-width="2" fill="none"/><rect x="48.5" y="13" width="3" height="6" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="3" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="1" fill="black" stroke="none"/>`,
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
	{
		type: "svg",
		icon: "car",
		label: "furniture.car",
		defaultWidth: 1800,
		defaultHeight: 4500,
	},
	{
		type: "svg",
		icon: "carpet",
		label: "furniture.carpet",
		defaultWidth: 2000,
		defaultHeight: 1400,
	},
	{
		type: "svg",
		icon: "cat-bed",
		label: "furniture.cat_bed",
		defaultWidth: 500,
		defaultHeight: 500,
	},
	{
		type: "svg",
		icon: "dog-bed",
		label: "furniture.dog_bed",
		defaultWidth: 800,
		defaultHeight: 600,
	},
	{
		type: "svg",
		icon: "pool",
		label: "furniture.pool",
		defaultWidth: 5000,
		defaultHeight: 3000,
	},
	{
		type: "svg",
		icon: "bedside-table",
		label: "furniture.bedside_table",
		defaultWidth: 500,
		defaultHeight: 500,
	},
	{
		type: "svg",
		icon: "bidet",
		label: "furniture.bidet",
		defaultWidth: 400,
		defaultHeight: 500,
	},
	{
		type: "svg",
		icon: "washbasin",
		label: "furniture.washbasin",
		defaultWidth: 600,
		defaultHeight: 420,
	},
	{
		type: "svg",
		icon: "hot-tub",
		label: "furniture.hot_tub",
		defaultWidth: 1500,
		defaultHeight: 1500,
	},
	{
		type: "svg",
		icon: "cabinet",
		label: "furniture.cabinet",
		defaultWidth: 800,
		defaultHeight: 400,
	},
	{
		type: "svg",
		icon: "ceiling-fan",
		label: "furniture.ceiling_fan",
		defaultWidth: 1200,
		defaultHeight: 1200,
	},
	{
		type: "svg",
		icon: "counter",
		label: "furniture.counter",
		defaultWidth: 2000,
		defaultHeight: 400,
	},
	{
		type: "svg",
		icon: "cupboard",
		label: "furniture.cupboard",
		defaultWidth: 1000,
		defaultHeight: 500,
	},
	{
		type: "svg",
		icon: "desk",
		label: "furniture.desk",
		defaultWidth: 1400,
		defaultHeight: 700,
	},
	{
		type: "svg",
		icon: "fridge",
		label: "furniture.fridge",
		defaultWidth: 700,
		defaultHeight: 700,
	},
	{
		type: "svg",
		icon: "kitchen-island",
		label: "furniture.kitchen_island",
		defaultWidth: 2000,
		defaultHeight: 800,
	},
	{
		type: "svg",
		icon: "side-table",
		label: "furniture.side_table",
		defaultWidth: 500,
		defaultHeight: 500,
	},
	{
		type: "svg",
		icon: "sliding-door",
		label: "furniture.sliding_door",
		defaultWidth: 1000,
		defaultHeight: 200,
	},
	{
		type: "svg",
		icon: "speaker",
		label: "furniture.speaker",
		defaultWidth: 300,
		defaultHeight: 300,
	},
	{
		type: "svg",
		icon: "washing-machine",
		label: "furniture.washing_machine",
		defaultWidth: 600,
		defaultHeight: 600,
	},
	{
		type: "svg",
		icon: "window",
		label: "furniture.window",
		defaultWidth: 1000,
		defaultHeight: 150,
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

// LD2450 hardware tracks at most 3 targets concurrently — the colour palette
// must stay in lock-step with this cap.
export const MAX_TARGETS = 3;

// Target dot colors (1 per target, high contrast)
export const TARGET_COLORS = ["#2196F3", "#FF5722", "#4CAF50"]; // blue, red-orange, green
/* v8 ignore start — module-load invariant guard, no runtime branch to hit */
if (TARGET_COLORS.length !== MAX_TARGETS) {
	throw new Error(
		`TARGET_COLORS palette (${TARGET_COLORS.length}) must match MAX_TARGETS (${MAX_TARGETS})`,
	);
}
/* v8 ignore stop */

export const DEBUG_LOG_MAX = 100;

// FOV geometry constants (120° wedge)
export const FOV_HALF_ANGLE = Math.PI / 3; // 60°
export const FOV_X_EXTENT = MAX_RANGE * Math.sin(Math.PI / 3); // ~5196
