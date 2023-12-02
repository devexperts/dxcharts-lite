import { wrap, transfer, Remote } from 'comlink';
import { CanvasModel } from '../../model/canvas.model';
import { OffscreenWorker } from './offscreen-worker';
import { CanvasOffscreenContext2D } from './canvas-offscreen-wrapper';
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
		if (!canvases[i].options.offscreen) {
			continue;
		}
		// @ts-ignore
		// eslint-disable-next-line no-restricted-syntax
		const canvas = canvases[i] as CanvasModel<CanvasOffscreenContext2D>;
		const offscreen = canvas.canvas.transferControlToOffscreen();
		const idx = startOffset + i;
		canvas.idx = idx;
		canvas.ctx.idx = idx;
		await worker.addCanvas(idx, canvas.options, transfer(offscreen, [offscreen]), canvas.ctx.buffer);
	}

	return worker;
};
