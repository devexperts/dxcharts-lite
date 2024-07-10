import { Remote, transfer, wrap } from 'comlink';
import { CanvasModel } from '../../model/canvas.model';
import { isOffscreenCanvasModel } from './canvas-offscreen-wrapper';
import { OffscreenWorker } from './offscreen-worker';
import { createMutex } from '../../utils/mutex';
import { OffscreenFeature } from '../../chart.config';

export const isOffscreenWorkerAvailable = typeof Worker !== 'undefined' && typeof SharedArrayBuffer !== 'undefined';

if (!isOffscreenWorkerAvailable) {
	console.warn('Offscreen worker is not available.');
}

const OffscreenWorkerClass =
	isOffscreenWorkerAvailable &&
	wrap<typeof OffscreenWorker>(new Worker(new URL('./offscreen-worker.js', import.meta.url)));

// create global worker instance, so every chart will use the same worker
export let offscreenWorker: Remote<OffscreenWorker>;
// canvases idx offset is needed to avoid collisions between multiple charts canvases
let canvasesIdxOffset = 0;

const mutex = createMutex();

export const initOffscreenWorker = async(canvases: CanvasModel[], fonts: OffscreenFeature['fonts']): Promise<Remote<OffscreenWorker>> => {
	await mutex.calculateSafe(async() => {
		if (offscreenWorker === undefined) {
			if (typeof OffscreenWorkerClass === 'function') {
				offscreenWorker = await new OffscreenWorkerClass(window.devicePixelRatio, fonts);
			} else {
				return Promise.reject('Offscreen worker is not available.');
			}
		}
	});
	const startOffset = canvasesIdxOffset;
	canvasesIdxOffset += 100;
	for (let i = 0; i < canvases.length; i++) {
		const canvas = canvases[i];
		if (!isOffscreenCanvasModel(canvas)) {
			continue;
		}
		// @ts-ignore
		const offscreen = canvas.canvas.transferControlToOffscreen();
		const idx = startOffset + i;
		canvas.idx = idx;
		const buffer = await offscreenWorker.addCanvas(
			idx,
			canvas.options,
			transfer(offscreen, [offscreen]),
			canvas.options.offscreenBufferSize ?? 4000,
		);
		canvas.ctx.initBuffer(buffer);
		canvas.fireCanvasReady();
	}
	return offscreenWorker;
};