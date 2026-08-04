import { HEX_COLOR_WITH_ALPHA_REGEXP, isRgba } from '../color.utils';

describe('color.utils', () => {
	describe('HEX_COLOR_WITH_ALPHA_REGEXP', () => {
		it('should match 4-digit and 8-digit hex colors', () => {
			expect(HEX_COLOR_WITH_ALPHA_REGEXP.test('#00B4')).toBe(true);
			expect(HEX_COLOR_WITH_ALPHA_REGEXP.test('#00B40080')).toBe(true);
			expect(HEX_COLOR_WITH_ALPHA_REGEXP.test('#00b400ff')).toBe(true);
		});

		it('should not match hex colors without alpha', () => {
			expect(HEX_COLOR_WITH_ALPHA_REGEXP.test('#00B400')).toBe(false);
			expect(HEX_COLOR_WITH_ALPHA_REGEXP.test('#0BF')).toBe(false);
		});
	});

	describe('isRgba / RGBA_COLOR_REGEXP', () => {
		it('should accept alpha as integer 0', () => {
			expect(isRgba('rgba(0, 180, 0, 0)')).toBeTruthy();
			expect(isRgba('rgba(41,98,255,0)')).toBeTruthy();
		});

		it('should accept fractional and opaque alpha values', () => {
			expect(isRgba('rgba(0, 180, 0, 0.35)')).toBeTruthy();
			expect(isRgba('rgba(0, 180, 0, 1)')).toBeTruthy();
			expect(isRgba('rgba(0, 180, 0, .5)')).toBeTruthy();
		});

		it('should reject rgb without alpha and invalid alpha', () => {
			expect(isRgba('rgb(0, 180, 0)')).toBeFalsy();
			expect(isRgba('rgba(0, 180, 0, 1.5)')).toBeFalsy();
			expect(isRgba('rgba(0, 180, 0, -0.1)')).toBeFalsy();
		});
	});
});
