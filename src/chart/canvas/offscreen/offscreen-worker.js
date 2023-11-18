import { expose } from 'comlink';

export class OffscreenWorker {
	constructor() {
		this.canvases = {};
		this.ctxs = {};
	}

	addCanvas(canvasId, canvas) {
		this.canvases[canvasId] = canvas;
		this.ctxs[canvasId] = canvas.getContext('2d');
	}

	executeCanvasCommands(ctxCommandsGroup) {
		// canvasCommands.forEach(command => {
		// 	const [canvasId, method, ...args] = command;
		// 	const canvas = this.canvases[canvasId];
		// 	if (canvas !== undefined) {
		// 		if (method === 'style') {
		//             // const [prop, val] = args;
		//             // canvas.style[prop] = val;
		// 		} else {
		// 			// if (canvas[method] instanceof Function) {
		// 			// 	canvas[method](...args);
		// 			// } else {
		// 			// 	canvas[method] = args[0];
		// 			// }
		// 		}
		// 	}
		// });
		ctxCommandsGroup.forEach(ctxCommands => {
			let counter = 0;
			const canvasId = ctxCommands[counter++];
			const ctx = this.ctxs[canvasId];
			while (ctxCommands[counter] !== 'EOF') {
				const method = ctxCommands[counter++];
				const args = [];
				while (ctxCommands[counter] !== 'EOC') {
					args.push(ctxCommands[counter++]);
				}
				if (ctx[method] instanceof Function) {
					ctx[method](...args);
				} else {
					ctx[method] = args[0];
				}
                counter++;
			}
		});
	}
}

expose(OffscreenWorker);
