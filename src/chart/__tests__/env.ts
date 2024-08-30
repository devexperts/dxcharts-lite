/* @see https://jestjs.io/docs/29.4/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom */
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

Object.defineProperty(window, 'ResizeObserver', {
	writable: true,
	value: jest.fn().mockImplementation(
		(): ResizeObserver => ({
			observe: jest.fn(),
			unobserve: jest.fn(),
			disconnect: jest.fn(),
		}),
	),
});
