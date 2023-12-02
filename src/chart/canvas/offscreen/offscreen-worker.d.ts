export declare class OffscreenWorker {
	constructor(): void;

	/**
	 * Adds offscreen canvas to the worker
	 */
	addCanvas(
		idx: number,
		options: CanvasRenderingContext2DSettings,
		canvas: OffscreenCanvas,
		sharedMemory: SharedArrayBuffer,
	): void;

	/**
	 * Syncs an array of strings and their ids between main thread and worker thread
	 * the format of data in this array is [str1, id1, str2, id2, ...].
	 * For detailed explanation @see CanvasOffscreenContext2D class
	 */
	syncStrings(strings: Array<string | number>): void;

	/**
	 * Executes canvas commands for the given canvas ids
	 */
	executeCanvasCommands(canvasIds: number[]): void;
}
