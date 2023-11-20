import { expose } from 'comlink';
import { num2Ctx } from './canvas-ctx.mapper';

const END_OF_FILE = 0xdead;

const stringsPool = new Map();

export class OffscreenWorker {
	constructor() {
		this.ctxs = {};
		this.buffers = {};
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

	addCanvas(canvasId, options, canvas, commandsBuffer) {
		this.buffers[canvasId] = new Float64Array(commandsBuffer);
		this.ctxs[canvasId] = canvas.getContext('2d', options);
	}

	syncStrings(strs) {
		for (let i = 0; i < strs.length; i += 2) {
			stringsPool.set(strs[i + 1], strs[i]);
		}
	}

	executeCanvasCommands() {
		for (const [canvasId, ctxCommands] of Object.entries(this.buffers)) {
			// if (!canvasIds.includes(canvasId)) {
			// 	continue;
			// }
			let counter = 0;
			const ctx = this.ctxs[canvasId];
			while (ctxCommands[counter] !== END_OF_FILE) {
				const method = num2Ctx[ctxCommands[counter++]];
				if (method === undefined) {
					debugger;
				}
				const argsLen = ctxCommands[counter++];
				if (argsLen !== -1) {
					const args = this.args[argsLen];
					for (let i = 0; i < argsLen; i++) {
						const arg = ctxCommands[counter++];
						if (args === undefined) {
							debugger;
						}
						args[i] = stringsPool.get(arg) ?? arg;
					}
					ctx[method].apply(ctx, args);
				} else {
					const arg = ctxCommands[counter++];
					ctx[method] = stringsPool.get(arg) ?? arg;
				}
			}
			// ctxCommands[0] = END_OF_FILE;
		}
	}
}

expose(OffscreenWorker);
