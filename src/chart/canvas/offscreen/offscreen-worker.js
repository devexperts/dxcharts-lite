import { expose } from 'comlink';
import { num2Ctx, END_OF_FILE } from './canvas-ctx.mapper';

/**
 * Global pool of strings which is used to synchronize strings between main thread and worker thread.
 * It's intentional that this map is global, because we want to have common strings pool between all charts.
 * The goal of this pool is to have a unique string id for each string and write this id to the shared buffer,
 * so we don't have to encode and write the string to the buffer (encoding string is not an easy task,
 * also on repeated encodings it'll be much faster since we write only one number instead of array of bytes for corresponding string).
 */
const stringsPool = new Map();

export class OffscreenWorker {
	constructor() {
		this.ctxs = {};
		this.buffers = {};
		// Pre-allocate args arrays to avoid GC
		this.args = [
			new Array(0),
			new Array(1),
			new Array(2),
			new Array(3),
			new Array(4),
			new Array(5),
			new Array(6),
			new Array(7),
			new Array(8),
			new Array(9),
			new Array(10),
		];
	}

	defineCustomCanvasProperties(ctx) {
		// reroute width and height setter to canvas
		Object.defineProperty(ctx, 'width', {
			set(width) {
				ctx.canvas.width = width;
			},
		});
		Object.defineProperty(ctx, 'height', {
			set(height) {
				ctx.canvas.height = height;
			},
		});
		// define custom setLineDashFlat method, because we can't transfer objects like array directly using SharedArrayBuffer
		Object.defineProperty(ctx, 'setLineDashFlat', {
			value(...dash) {
				ctx.setLineDash(dash);
			},
		});
	}

	addCanvas(canvasId, options, canvas, commandsBuffer) {
		this.buffers[canvasId] = new Float64Array(commandsBuffer);
		const ctx = canvas.getContext('2d', options);
		this.defineCustomCanvasProperties(ctx);
		this.ctxs[canvasId] = ctx;
	}

	syncStrings(strs) {
		for (let i = 0; i < strs.length; i += 2) {
			stringsPool.set(strs[i + 1], strs[i]);
		}
	}

	executeCanvasCommands(canvasIds) {
		// transform canvasIds to strings
		canvasIds = canvasIds.map(canvasId => '' + canvasId);
		for (const [canvasId, ctxCommands] of Object.entries(this.buffers)) {
			if (!canvasIds.includes(canvasId)) {
				continue;
			}
			let counter = 0;
			const ctx = this.ctxs[canvasId];
			while (ctxCommands[counter] !== END_OF_FILE) {
				const method = num2Ctx[ctxCommands[counter++]];
				const argsLen = ctxCommands[counter++];
				if (argsLen !== -1) {
					const args = this.args[argsLen];
					for (let i = 0; i < argsLen; i++) {
						const arg = ctxCommands[counter++];
						// simple heuristic to detect strings (@see CanvasOffscreenContext2D)
						args[i] = arg < -1_000_000_000 ? stringsPool.get(arg) : arg;
					}
					ctx[method].apply(ctx, args);
				} else {
					const arg = ctxCommands[counter++];
					// simple heuristic to detect strings (@see CanvasOffscreenContext2D)
					ctx[method] = arg < -1_000_000_000 ? stringsPool.get(arg) : arg;
				}
			}
		}
	}
}

expose(OffscreenWorker);
