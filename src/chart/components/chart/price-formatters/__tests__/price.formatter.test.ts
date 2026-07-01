import { getDefaultConfig } from '../../../../chart.config';
import { PriceIncrementsUtils } from '../../../../utils/price-increments.utils';
import { createPercentFormatter, createRegularPriceFormatter } from '../price.formatter';

const DEFAULT_PRICE_PRECISIONS = PriceIncrementsUtils.computePrecisions([0.01, 1, 0.1, 10, 0.01]);
const DEFAULT_INTL_FORMATTER = getDefaultConfig().intlFormatter;
const DEFAULT_Y_AXIS_CONFIG = getDefaultConfig().components.yAxis;

interface MockIntlFormatter {
	decimalSeparator?: string;
	thousandsSeparator?: string;
}

interface MockDataSeries {
	pricePrecisions: number[];
	getBaseline?: () => number;
}

interface MockExtentOptions {
	intlFormatter?: MockIntlFormatter;
	pricePrecisions?: number[];
	dataSeries?: Set<MockDataSeries>;
}

const createMockDataSeries = (baseline: number, pricePrecisions = DEFAULT_PRICE_PRECISIONS): MockDataSeries => ({
	pricePrecisions,
	getBaseline: () => baseline,
});

const createMockExtent = ({
	intlFormatter = DEFAULT_INTL_FORMATTER,
	pricePrecisions = DEFAULT_PRICE_PRECISIONS,
	dataSeries,
}: MockExtentOptions = {}) => ({
	dataSeries: dataSeries ?? new Set([{ pricePrecisions }]),
	paneComponent: {
		intlFormatter,
	},
});

const createRegularFormatter = (options?: MockExtentOptions, yAxisConfig = createRegularYAxisConfig()) => {
	// @ts-expect-error partial YExtentComponent mock for price formatter tests
	return createRegularPriceFormatter(createMockExtent(options), yAxisConfig);
};

const createPercentFormatterFromMock = (options?: MockExtentOptions) => {
	// @ts-expect-error partial YExtentComponent mock for price formatter tests
	return createPercentFormatter(createMockExtent(options));
};

const createTreasuryYAxisConfig = () => ({
	...DEFAULT_Y_AXIS_CONFIG,
	treasuryFormat: { enabled: true },
});

const createRegularYAxisConfig = () => ({
	...DEFAULT_Y_AXIS_CONFIG,
	treasuryFormat: { enabled: false },
});

describe('createRegularPriceFormatter', () => {
	describe('input coercion', () => {
		it('should format numeric values', () => {
			const formatter = createRegularFormatter();

			expect(formatter(123.45)).toBe('123.45');
		});

		it('should parse string values without separators by default', () => {
			const formatter = createRegularFormatter({
				intlFormatter: { decimalSeparator: ',', thousandsSeparator: '_' },
			});
			expect(formatter('3456.78')).toBe('3456.78');
		});

		it('should return em dash for falsy non-string values', () => {
			const formatter = createRegularFormatter();

			expect(formatter(undefined)).toBe('—');
			expect(formatter(null)).toBe('—');
		});
	});

	describe('thousands and decimal separators', () => {
		it('should not apply thousandsSeparator by default for values of 1000 or more', () => {
			const formatter = createRegularFormatter();
			expect(formatter(1234.5)).toBe('1234.50');
			expect(formatter(1234567.89)).toBe('1234567.89');
			expect(formatter(1234567890.12)).toBe('1234567890.12');
		});

		it('should use toFixed without thousands grouping for values below 1000', () => {
			const formatter = createRegularFormatter();

			expect(formatter(999.99)).toBe('999.99');
		});

		it('should support custom decimalSeparator and thousandsSeparator when formatWithIntlSeparators is true', () => {
			const atWithSpaceFormatter = createRegularFormatter({
				intlFormatter: { decimalSeparator: '@', thousandsSeparator: ' ' },
			});
			const enUSFormatter = createRegularFormatter({
				intlFormatter: { decimalSeparator: '.', thousandsSeparator: ',' },
			});
			expect(enUSFormatter(1234.5, true)).toBe('1,234.50');
			expect(enUSFormatter(1234567.89, true)).toBe('1,234,567.89');
			expect(enUSFormatter(1234567890.12, true)).toBe('1,234,567,890.12');
			expect(atWithSpaceFormatter(1234.5, true)).toBe('1 234@50');
		});
	});

	describe('treasury formatting', () => {
		it('should format treasury prices when treasury format is enabled', () => {
			const formatter = createRegularFormatter(undefined, createTreasuryYAxisConfig());

			expect(formatter(132.0625)).toBe("132'02");
		});

		it('should not group treasury integer part below 1000 even with thousandsSeparator', () => {
			const formatter = createRegularFormatter(
				{ intlFormatter: { decimalSeparator: '.', thousandsSeparator: ',' } },
				createTreasuryYAxisConfig(),
			);
			expect(formatter(999.99)).toBe("999'31");
		});

		it('should support custom thousandsSeparator in treasury format when formatWithIntlSeparators is true', () => {
			const commaSeparatorFormatter = createRegularFormatter(
				{ intlFormatter: { thousandsSeparator: ',' } },
				createTreasuryYAxisConfig(),
			);
			const spaceSeparatorFormatter = createRegularFormatter(
				{ intlFormatter: { thousandsSeparator: ' ' } },
				createTreasuryYAxisConfig(),
			);

			expect(spaceSeparatorFormatter(1234567.5, true)).toBe("1 234 567'16");
			expect(commaSeparatorFormatter(1234567.5, true)).toBe("1,234,567'16");
		});
	});

	describe('data series availability', () => {
		it('should return stringified value when main data series is missing', () => {
			const formatter = createRegularFormatter({ dataSeries: new Set() });

			expect(formatter(1234.56)).toBe('1234.56');
		});
	});

	describe('optional edge cases — review whether to keep', () => {
		// Boundary: exactly 1000 triggers thousands formatting path when formatWithIntlSeparators is true.
		it('should apply thousandsSeparator at exactly 1000 when formatWithIntlSeparators is true', () => {
			const formatter = createRegularFormatter({
				intlFormatter: { decimalSeparator: '.', thousandsSeparator: ',' },
			});

			expect(formatter(1000, true)).toBe('1,000.00');
		});

		// Current implementation uses `checkedValue >= 1000`, not absolute value.
		it('should apply thousandsSeparator for negative values above 1000 threshold check', () => {
			const formatter = createRegularFormatter({
				intlFormatter: { decimalSeparator: '.', thousandsSeparator: ',' },
			});

			expect(formatter(-1500, true)).toBe('-1,500.00');
		});

		// Treasury formatting takes precedence over intl thousands/decimal separators.
		it('should prefer treasury formatting over thousandsSeparator config', () => {
			const formatter = createRegularFormatter(
				{ intlFormatter: { decimalSeparator: ',', thousandsSeparator: ' ' } },
				createTreasuryYAxisConfig(),
			);

			expect(formatter(132.0625)).toBe("132'02");
		});

		// Invalid numeric strings become NaN and are stringified by the fallback path.
		it('should stringify NaN when data series is missing and input is not numeric', () => {
			const formatter = createRegularFormatter({ dataSeries: new Set() });

			expect(formatter('not-a-number')).toBe('NaN');
		});
	});
});

describe('createPercentFormatter', () => {
	describe('basic formatting', () => {
		it('should return zero percent for zero value', () => {
			const formatter = createPercentFormatterFromMock({ dataSeries: new Set() });

			expect(formatter(0)).toBe('0.00 %');
		});

		it('should format value without conversion when no series is available', () => {
			const formatter = createPercentFormatterFromMock({ dataSeries: new Set() });

			expect(formatter(5)).toBe('5.00 %');
		});

		it('should convert value using main data series baseline', () => {
			const formatter = createPercentFormatterFromMock({
				dataSeries: new Set([createMockDataSeries(100)]),
			});

			expect(formatter(110)).toBe('10.00 %');
		});

		it('should convert value using explicitly passed data series', () => {
			const formatter = createPercentFormatterFromMock({ dataSeries: new Set() });
			const series = createMockDataSeries(200);

			// @ts-expect-error partial DataSeriesModel mock for price formatter tests
			expect(formatter(250, series)).toBe('25.00 %');
		});

		it('should normalize negative zero percent display', () => {
			const formatter = createPercentFormatterFromMock({ dataSeries: new Set() });

			expect(formatter(-0.0001)).toBe('0.00 %');
		});
	});
});
