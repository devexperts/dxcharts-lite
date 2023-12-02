import { Remote, transfer, wrap } from 'comlink';
import { CanvasModel } from '../../model/canvas.model';
import { isOffscreenCanvasModel } from './canvas-offscreen-wrapper';
import { OffscreenWorker } from './offscreen-worker';
// const OffscreenWorker = wrap<any>(new Worker(new URL('./offscreen-worker.js', import.meta.url)));
const OffscreenWorkerClass = wrap<typeof OffscreenWorker>(new Worker(new URL('http://localhost:3000/worker.js')));
// create global worker instance, so every chart will use the same worker
let worker: Remote<OffscreenWorker>;
// canvases idx offset is needed to avoid collisions between multiple charts canvases
let canvasesIdxOffset = 0;

export const initOffscreenWorker = async (canvases: CanvasModel[]): Promise<Remote<OffscreenWorker>> => {
	if (worker === undefined) {
		worker = await new OffscreenWorkerClass();
	}
	const startOffset = canvasesIdxOffset;
	canvasesIdxOffset += 10;
	for (let i = 0; i < canvases.length; i++) {
		const canvas = canvases[i];
		if (!isOffscreenCanvasModel(canvas)) {
			continue;
		}
		const offscreen = canvas.canvas.transferControlToOffscreen();
		const idx = startOffset + i;
		canvas.idx = idx;
		await worker.addCanvas(idx, canvas.options, transfer(offscreen, [offscreen]), canvas.ctx.buffer);
	}
	return worker;
};
