export type TargetStatus = "active" | "pending" | "inactive";

export interface Target {
	x: number;
	y: number;
	speed: number;
	status: TargetStatus;
	signal: number;
}

export interface RawTarget {
	raw_x: number | null;
	raw_y: number | null;
}

export interface DeviceInfo {
	mac: string;
	name: string;
	host: string | null;
	available: boolean;
	configured: boolean;
}

export interface WizardCorner {
	raw_x: number;
	raw_y: number;
	offset_side: number;
	offset_fb: number;
}

export type SetupStep = "guide" | "corners" | "preview";
