// Polyfill for queueMicrotask in jsdom
if (typeof window.queueMicrotask === 'undefined') {
	window.queueMicrotask = (callback: () => void) => {
		Promise.resolve().then(callback);
	};
}
