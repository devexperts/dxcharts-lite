/*
 * Copyright (C) 2019 - 2023 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { validateChartElements, ValidatedChartElements } from './chart-elements';

import generateNewCanvasChartHTML from './canvas-chart-html';
import { FullChartConfig } from '../chart.config';

/**
 * Creates a default layout template for a canvas chart.
 * @function
 * @returns {HTMLTemplateElement} - The default layout template for a canvas chart.
 */
export function createDefaultLayoutTemplate(config: FullChartConfig) {
	const template = document.createElement('template');
	template.innerHTML = generateNewCanvasChartHTML(config.devexpertsPromoLink);
	return template;
}

/**
 * Extracts chart elements from a given container and returns them as a validated object.
 * @param {Element} container - The container element to search for chart elements.
 * @returns {ValidatedChartElements} - An object containing the chart elements as properties.
 * @throws {Error} - If some chart elements are missing.
 */
export function extractElements(container: Element): ValidatedChartElements {
	const result: Record<string, unknown> = {};
	const elements = Array.from(container.querySelectorAll('[data-element]'));
	if (elements.length !== 0) {
		elements.forEach(el => {
			result[el.getAttribute('data-element') ?? ''] = el;
		});
	}
	if (validateChartElements(result)) {
		return result;
	} else {
		throw new Error('Some chart elements are missing');
	}
}
