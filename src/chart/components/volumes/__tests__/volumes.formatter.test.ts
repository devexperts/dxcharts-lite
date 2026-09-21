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
});
