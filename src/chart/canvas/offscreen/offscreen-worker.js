import { expose } from 'comlink';
import { num2Ctx } from './canvas-ctx.mapper';

const END_OF_FILE = 0xdead;

// async function loadWasmModule() {
// 	// Fetch the Wasm binary
// 	const response = await fetch('multiply.wasm');
// 	const bytes = await response.arrayBuffer();

// 	// Create a WebAssembly.Module and instantiate it
// 	const wasmModule = new WebAssembly.Module(bytes);
// 	const wasmInstance = new WebAssembly.Instance(wasmModule);

// 	// Get the exported 'multiply' function
// 	const multiply = wasmInstance.exports.multiply;
// 	return multiply;
// }

const stringsPool = new Map();

export class OffscreenWorker {
	constructor() {
		this.canvases = {};
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
		// loadWasmModule().then(multiply => {
		// 	this.multiply = multiply;
		// });
	}

	addCanvas(canvasId, canvas, commandsBuffer) {
		this.canvases[canvasId] = canvas;
		this.buffers[canvasId] = new Float64Array(commandsBuffer);
		this.ctxs[canvasId] = canvas.getContext('2d');
	}

	syncStrings(strs) {
		for (let i = 0; i < strs.length; i += 2) {
			stringsPool.set(strs[i + 1], strs[i]);
		}
	}

	executeCanvasCommands() {
		for (const [canvasId, ctxCommands] of Object.entries(this.buffers)) {
			let counter = 0;
			const ctx = this.ctxs[canvasId];
			while (ctxCommands[counter] !== END_OF_FILE) {
				const method = num2Ctx[ctxCommands[counter++]];
				const argsLen = ctxCommands[counter++];
				if (argsLen !== -1) {
					const args = this.args[argsLen];
					for (let i = 0; i < argsLen; i++) {
						const arg = ctxCommands[counter++];
						args[i] = stringsPool.get(arg) ?? arg;
					}
					ctx[method].apply(ctx, args);
				} else {
					const arg = ctxCommands[counter++];
					ctx[method] = stringsPool.get(arg) ?? arg;
				}
			}
		}
	}
}

expose(OffscreenWorker);
