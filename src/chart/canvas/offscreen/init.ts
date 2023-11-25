import { wrap, transfer } from 'comlink';
import { CanvasModel } from '../../model/canvas.model';
const OffscreenWorker = wrap<any>(new Worker(new URL('./offscreen-worker.js', import.meta.url)));
// const OffscreenWorker = wrap<any>(new Worker(new URL('http://localhost:3000/worker.js')));
let worker: any = null;
let _startOffset = 0;

export const initOffscreenWorker = async (canvases: CanvasModel[]) => {
	if (worker === null) {
		// @ts-ignore
		worker = await new OffscreenWorker();
	}
	const startOffset = _startOffset;
	_startOffset += 100;
	for (let i = 0; i < canvases.length; i++) {
		const canvas = canvases[i];
		if (!canvas.options.offscreen) {
			continue;
		}
		const offscreen = canvas.canvas.transferControlToOffscreen();
		canvas.isOffscreen = true;
		const ii = startOffset + i;
		canvas.idx = ii;
		// @ts-ignore
		canvas.ctx.idx = ii;
		// @ts-ignore
		await worker.addCanvas(ii, canvas.options, transfer(offscreen, [offscreen]), canvas.ctx.buffer);
	}

	return worker;
};
