import { Remote, transfer, wrap } from 'comlink';
import { CanvasModel } from '../../model/canvas.model';
import { isOffscreenCanvasModel } from './canvas-offscreen-wrapper';
import { OffscreenWorker } from './offscreen-worker';

export const isOffscreenWorkerAvailable = typeof Worker !== 'undefined';
const OffscreenWorkerClass =
	isOffscreenWorkerAvailable &&
	wrap<typeof OffscreenWorker>(new Worker(new URL('./offscreen-worker.js', import.meta.url)));

// create global worker instance, so every chart will use the same worker
export let offscreenWorker: Remote<OffscreenWorker>;
// canvases idx offset is needed to avoid collisions between multiple charts canvases
let canvasesIdxOffset = 0;

export const initOffscreenWorker = async (canvases: CanvasModel[]): Promise<Remote<OffscreenWorker>> => {
	if (offscreenWorker === undefined) {
		if (typeof OffscreenWorkerClass === 'function') {
			offscreenWorker = await new OffscreenWorkerClass();
		} else {
			return Promise.reject('Offscreen worker is not available.');
		}
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
		await offscreenWorker.addCanvas(idx, canvas.options, transfer(offscreen, [offscreen]), canvas.ctx.buffer);
	}
	return offscreenWorker;
};
