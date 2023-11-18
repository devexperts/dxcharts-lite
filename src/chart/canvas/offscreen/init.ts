import { wrap, transfer } from 'comlink';
import { CanvasModel } from '../../model/canvas.model';

export const fun = async(canvases: CanvasModel[]) => {
	const OffscreenWorker = wrap<any>(new Worker(new URL('http://localhost:3000/worker.js')));

	// @ts-ignore
	const worker = await (new OffscreenWorker());
	for (const canvas of canvases) { 
		const offscreen = canvas.canvas.transferControlToOffscreen();
		await worker.addCanvas(canvas._canvasId, transfer(offscreen, [offscreen]));
	}
	
    return worker;
};
