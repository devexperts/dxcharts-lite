import { volumeFormatter } from '../volumes.formatter';

describe('volumes.formatter', () => {
	it('should format volume with default precision', () => {
		expect(volumeFormatter(123.123456)).toBe('123.1');
		expect(volumeFormatter(123)).toBe('123.0');
		expect(volumeFormatter(123.92416)).toBe('123.9');
		expect(volumeFormatter(123.3)).toBe('123.3');
		expect(volumeFormatter(0)).toBe('0.0');
		expect(volumeFormatter(-123.123456)).toBe('-123.1');
		expect(volumeFormatter(-123)).toBe('-123.0');
		expect(volumeFormatter(-123.92416)).toBe('-123.9');
		expect(volumeFormatter(-123.3)).toBe('-123.3');
	});

	it('should switch to the next unit instead of showing 1000 of the current one', () => {
		expect(volumeFormatter(999949)).toBe('999.9K');
		expect(volumeFormatter(999950)).toBe('1.0M');
		expect(volumeFormatter(999994)).toBe('1.0M');
		expect(volumeFormatter(-999950)).toBe('-1.0M');
		expect(volumeFormatter(999949499)).toBe('999.9M');
		expect(volumeFormatter(999949500)).toBe('1.0B');
		expect(volumeFormatter(999999994)).toBe('1.0B');
	});
});
