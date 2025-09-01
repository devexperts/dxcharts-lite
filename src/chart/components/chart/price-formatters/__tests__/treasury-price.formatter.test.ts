import { treasuryPriceFormatter, parseTreasuryPrice, isTreasuryPriceFormat, TREASURY_32ND } from '../treasury-price.formatter';

describe('Treasury Price Formatter', () => {
	describe('treasuryPriceFormatter', () => {
		it('should format decimal prices to treasury format', () => {
			expect(treasuryPriceFormatter(132.0)).toBe("132'00");
			expect(treasuryPriceFormatter(132.0625)).toBe("132'02");
			expect(treasuryPriceFormatter(132.3125)).toBe("132'10");
			expect(treasuryPriceFormatter(132.5)).toBe("132'16");
			expect(treasuryPriceFormatter(132.96875)).toBe("132'31");
		});

		it('should handle edge cases', () => {
			expect(treasuryPriceFormatter(0)).toBe("0'00");
			expect(treasuryPriceFormatter(0.03125)).toBe("0'01");
			expect(treasuryPriceFormatter(1.0)).toBe("1'00");
		});
	});

	describe('parseTreasuryPrice', () => {
		it('should parse treasury format back to decimal', () => {
			expect(parseTreasuryPrice("132'00")).toBe(132.0);
			expect(parseTreasuryPrice("132'02")).toBe(132.0625);
			expect(parseTreasuryPrice("132'10")).toBe(132.3125);
			expect(parseTreasuryPrice("132'16")).toBe(132.5);
			expect(parseTreasuryPrice("132'31")).toBe(132.96875);
		});

		it('should handle edge cases', () => {
			expect(parseTreasuryPrice("0'00")).toBe(0);
			expect(parseTreasuryPrice("0'01")).toBe(0.03125);
			expect(parseTreasuryPrice("1'00")).toBe(1.0);
		});

		it('should return NaN for invalid formats', () => {
			expect(parseTreasuryPrice("invalid")).toBe(NaN);
			expect(parseTreasuryPrice("132'")).toBe(NaN);
			expect(parseTreasuryPrice("'10")).toBe(NaN);
			expect(parseTreasuryPrice("132'1")).toBe(NaN);
			expect(parseTreasuryPrice("132'100")).toBe(NaN);
			expect(parseTreasuryPrice("abc123")).toBe(NaN);
		});
	});

	describe('isTreasuryPriceFormat', () => {
		it('should identify valid treasury format strings', () => {
			expect(isTreasuryPriceFormat("132'00")).toBe(true);
			expect(isTreasuryPriceFormat("132'10")).toBe(true);
			expect(isTreasuryPriceFormat("0'00")).toBe(true);
			expect(isTreasuryPriceFormat("1'31")).toBe(true);
		});

		it('should reject invalid formats', () => {
			expect(isTreasuryPriceFormat("invalid")).toBe(false);
			expect(isTreasuryPriceFormat("132")).toBe(false);
			expect(isTreasuryPriceFormat("132'")).toBe(false);
			expect(isTreasuryPriceFormat("'10")).toBe(false);
			expect(isTreasuryPriceFormat("132'1")).toBe(false);
			expect(isTreasuryPriceFormat("132'100")).toBe(false);
		});
	});

	describe('TREASURY_32ND constant', () => {
		it('should equal 1/32', () => {
			expect(TREASURY_32ND).toBe(1 / 32);
			expect(TREASURY_32ND).toBe(0.03125);
		});
	});

	describe('Round trip conversion', () => {
		it('should maintain precision through format and parse cycle', () => {
			const originalPrice = 234.3125;
			const formatted = treasuryPriceFormatter(originalPrice);
			const parsed = parseTreasuryPrice(formatted);
			expect(parsed).toBe(originalPrice);
		});

		it('should work with various precision levels', () => {
			const testCases = [
				132.0,      // 132'00
				132.03125,  // 132'01
				132.0625,   // 132'02
				132.09375,  // 132'03
				132.125,    // 132'04
				132.15625,  // 132'05
				132.1875,   // 132'06
				132.21875,  // 132'07
				132.25,     // 132'08
				132.28125,  // 132'09
				132.3125,   // 132'10
			];

			testCases.forEach(price => {
				const formatted = treasuryPriceFormatter(price);
				const parsed = parseTreasuryPrice(formatted);
				expect(parsed).toBe(price);
			});
		});
	});
});
