import { wrap, transfer } from 'comlink';
import { CanvasModel } from '../../model/canvas.model';

export const initOffscreenWorker = async (canvases: CanvasModel[]) => {
	const OffscreenWorker = wrap<any>(new Worker(new URL('http://localhost:3000/worker.js')));

	// @ts-ignore
	const worker = await new OffscreenWorker();
	for (let i = 0; i < canvases.length; i++) {
		const canvas = canvases[i];
		const offscreen = canvas.canvas.transferControlToOffscreen();
		canvas.isOffscreen = true;
		canvas.idx = i;
		// @ts-ignore
		canvas.ctx.idx = i;
		// @ts-ignore
		await worker.addCanvas(i, transfer(offscreen, [offscreen]), canvas.ctx.buffer);
	}

	return worker;
};
