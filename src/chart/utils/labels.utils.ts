import { DateTimeFormatConfig } from '../chart.config';
import { VisualYAxisLabel } from '../components/y_axis/price_labels/y-axis-labels.model';

export const labelsPeriodPredicate = (config: DateTimeFormatConfig | VisualYAxisLabel, period: number) => {
	if (config.showWhen) {
		const predicates = [];
		if (config.showWhen.periodLessThen) {
			predicates.push(() => period < (config.showWhen?.periodLessThen ?? 0));
		}
		if (config.showWhen.periodMoreThen) {
			predicates.push(() => period >= (config.showWhen?.periodMoreThen ?? 0));
		}
		return predicates.every(p => p());
	}
	return true;
};
