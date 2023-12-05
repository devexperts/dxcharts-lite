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

const bigPrimeNumber = 317;

export class OffscreenWorker {
	constructor(dpr) {
		this.dpr = dpr;
		this.ctxs = new Map();
		this.buffers = new Map();
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
		Object.defineProperty(ctx, 'setGradientFillStyle', {
			value(x, y, width, height, offset0, color0, offset1, color1) {
				const gradient = ctx.createLinearGradient(x, y, width, height);
				gradient.addColorStop(offset0, color0);
				gradient.addColorStop(offset1, color1);
				ctx.fillStyle = gradient;
			},
		});
		const ctxs = this.ctxs;
		const dpr = this.dpr;
		Object.defineProperty(ctx, 'redrawBackgroundArea', {
			value(backgroundCtxIdx, ctxIdx, x, y, width, height, opacity) {
				const backgroundCtx = ctxs.get(backgroundCtxIdx);
				const ctx = ctxs.get(ctxIdx);
				ctx &&
					backgroundCtx &&
					redrawBackgroundArea(dpr, backgroundCtx, ctx, x, y, width, height, opacity);
			},
		});
	}

	addCanvas(canvasIdx, options, canvas, commandsBuffer) {
		this.buffers.set(canvasIdx, new Float64Array(commandsBuffer));
		const ctx = canvas.getContext('2d', options);
		this.defineCustomCanvasProperties(ctx);
		this.ctxs.set(canvasIdx, ctx);
	}

	syncStrings(strs) {
		for (let i = 0; i < strs.length; i += 2) {
			stringsPool.set(strs[i + 1], strs[i]);
		}
	}

	executeCanvasCommands(canvasIds) {
		for (const [canvasId, ctxCommands] of this.buffers.entries()) {
			if (!canvasIds.includes(canvasId)) {
				continue;
			}
			let counter = 0;
			const ctx = this.ctxs.get(canvasId);
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

	getColorId(idx, x, y) {
		const ctx = this.ctxs.get(idx);
		if (!ctx) {
			return -1;
		}
		const data = ctx.getImageData(x * this.dpr, y * this.dpr, 1, 1).data;
		const id = (data[0] * 65536 + data[1] * 256 + data[2]) / bigPrimeNumber;
		return id;
	}
}

expose(OffscreenWorker);

// eslint-disable-next-line no-bitwise
const floor = value => ~~value;
// this function in used in case when
// some entity can overlap with another chart entity, so we need to hide the another entity
export const redrawBackgroundArea = (dpr, backgroundCtx, ctx, x, y, width, height, opacity) => {
	const xCoord = x * dpr;
	const yCoord = y * dpr;
	const widthCoord = width * dpr;
	const heightCoord = height * dpr;
	let imageData = backgroundCtx.getImageData(xCoord, yCoord, widthCoord, heightCoord);
	if (opacity !== undefined) {
		// convert rgba to rgb for black background
		//		Target.R = (Source.A * Source.R)
		//		Target.G = (Source.A * Source.G)
		//		Target.B = (Source.A * Source.B)
		const alpha = imageData.data[3] / 255;
		if (alpha === 1) {
			// fast path
			for (let i = 3; i < imageData.data.length; i += 4) {
				imageData.data[i] = floor(imageData.data[i] * opacity);
			}
		} else {
			for (let i = 0; i < imageData.data.length; i++) {
				const v = imageData.data[i];
				imageData.data[i] = i % 4 === 3 ? floor(v * opacity) : floor(alpha * v);
			}
		}
		imageData = new ImageData(
			// i % 4 === 3 - this condition is for alpha channel
			imageData.data,
			imageData.width,
			imageData.height,
			{ colorSpace: imageData.colorSpace },
		);
	}
	ctx.putImageData(imageData, xCoord, yCoord);
};
