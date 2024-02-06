import { Candle, nameDirection } from "../../model/candle.model";
import { DataSeriesPoint, VisualSeriesPoint } from "../../model/data-series.model";
import { Index, Pixel, Unit } from "../../model/scaling/viewport.model";
import VisualCandle from "../../model/visual-candle";
import { DEFAULT_PERIOD, fakeCandle, fakeDataPoint } from "./fake-candles";

/**
 * Generates fake candle for left and right "out of data range" zones.
 * Requires period to calculate the fake timestamp.
 * The timestamp won't take session breaks or holidays into account.
 */
export const fakeVisualCandle = (
	dataPoints: Candle[],
	visualCandles: VisualCandle[],
	candleWidth: number,
	index: Index,
	period: number = DEFAULT_PERIOD,
): VisualCandle => {
	const candle = fakeCandle(dataPoints, index, period);
	// in case we have equivolume
	candle.volume = candleWidth;
	let x: Pixel;
	if (visualCandles.length === 0) {
		x = 0;
	} else if (index >= visualCandles.length) {
		const lastCandle = visualCandles[visualCandles.length - 1];
		const candlesCountInBetween = index - (visualCandles.length - 1);
		const offsetFromLast: Unit = candlesCountInBetween * candleWidth;
		x = lastCandle.centerUnit + offsetFromLast;
	} else {
		const firstCandle = visualCandles[0];
		const candlesCountInBetween = -index;
		const offsetFromFirst: Unit = candlesCountInBetween * candleWidth;
		x = firstCandle.centerUnit - offsetFromFirst;
	}
	return new VisualCandle(
		x,
		candleWidth,
		candle.open,
		candle.close,
		candle.lo,
		candle.hi,
		nameDirection(candle.open, candle.close),
		candle,
	);
};

export const fakeVisualPoint = (
	dataPoints: DataSeriesPoint[],
	visualPoints: VisualSeriesPoint[],
	meanDataWidth: number,
	index: Index,
	period: number = DEFAULT_PERIOD,
): VisualSeriesPoint => {
	const candle = fakeDataPoint(dataPoints, index, period);
	let x: Pixel;
	if (visualPoints.length === 0) {
		x = 0;
	} else if (index >= visualPoints.length) {
		const lastCandle = visualPoints[visualPoints.length - 1];
		const candlesCountInBetween = index - (visualPoints.length - 1);
		const offsetFromLast: Unit = candlesCountInBetween * meanDataWidth;
		x = lastCandle.centerUnit + offsetFromLast;
	} else {
		const firstCandle = visualPoints[0];
		const candlesCountInBetween = -index;
		const offsetFromFirst: Unit = candlesCountInBetween * meanDataWidth;
		x = firstCandle.centerUnit - offsetFromFirst;
	}
	return new VisualSeriesPoint(x, candle.close);
};