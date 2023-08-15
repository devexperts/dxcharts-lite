import { clamp } from "../math.utils";

describe('math.utils', () => {
	describe('clamp', () => {
		it('should return the value if it is within the range', () => {
			expect(clamp(5, 0, 10)).toEqual(5);
		});

		it('should return the min value if the value is less than the min', () => {
			expect(clamp(-5, 0, 10)).toEqual(0);
		});

        it('should return the max value if the value is more than the max', () => {
			expect(clamp(15, 0, 10)).toEqual(10);
		});
	});
});
