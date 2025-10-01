export type SafariThrottleTimeMS = number;

/**
 * Safari canvas performance limits because of Safari's GPU limits
 */
export const SAFARI_CANVAS_LIMITS = {
	MAX_DIMENSION: 2048,
	MAX_TOTAL_PIXELS: 1_800_000,
	ZOOM_OPTIMIZED_PIXELS: 1_200_000,
} as const;

export const LARGE_SCREEN_PIXEL_THRESHOLD = 2_000_000; // 2M pixels
export const LARGE_SCREEN_THROTTLE_MS = 24;
export const SAFARI_THROTTLE_MS = 20;
export const DEFAULT_THROTTLE_MS = 16;
export const LOW_WHEEL_EVENTS_THRESHOLD = 10; // Minimum wheel events per second
export const WHEEL_MONITORING_INTERVAL_MS = 1000;

/**
 * Threshold for significant canvas area change to trigger subscription recreation
 * Prevents unnecessary recreation for minor size adjustments
 */
export const CANVAS_AREA_CHANGE_THRESHOLD = 50_000;

export const SafariThrottleTimeMSMap = {
	MIN: 60,
	LOW: 80,
	MEDIUM: 100,
	HIGH: 120,
	MAX: 150,
} as const;
