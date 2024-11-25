/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Point } from '../../inputlisteners/canvas-input-listener.component';
export interface CustomIcon {
	normal: string;
	hover: string;
}

export interface CustomIconImage {
	img: HTMLImageElement;
	svgHeight: number;
}

export const getIconHash = (type: string, state: keyof CustomIcon) => `${type}_${state}`;

/**
 * Creates a custom icon for a given event type.
 * @param {string} type - The type of the event.
 * @param {CustomIcon} [icon] - The custom icon object containing the normal and hover images.
 * @returns {void}
 */
export const createCustomIcon = (type: string, icon?: CustomIcon) => {
	if (icon) {
		const normal = createIconImage(icon.normal);
		const hover = createIconImage(icon.hover);

		return { type, normal, hover };
	}
};

/**
 * Creates an icon image from a string containing SVG data.
 * @param {string} iconString - The string containing SVG data.
 * @returns {CustomIconImage} An object containing an Image object and the height of the SVG element.
 */
export const createIconImage = (iconString: string): CustomIconImage => {
	const parser = new DOMParser();
	const svgSelector = parser.parseFromString(iconString, 'text/html').querySelector('svg');
	let svgHeight = 0;
	if (svgSelector) {
		svgHeight = parseInt(svgSelector.getAttribute('height') ?? '', 10);
	}
	const svg64 = btoa(iconString);
	const b64Start = 'data:image/svg+xml;base64,';
	const image64 = b64Start + svg64;
	const img = new Image();
	img.src = image64;

	return {
		img,
		svgHeight,
	};
};

export const drawCustomSvgIcon = (
	ctx: CanvasRenderingContext2D,
	icons: Record<string, CustomIconImage>,
	point: Point,
	type: string,
	isHovered: boolean,
) => {
	if (isHovered) {
		const hover = icons[getIconHash(type, 'hover')];
		ctx.drawImage(hover.img, point.x - hover.svgHeight / 2, point.y - hover.svgHeight / 2);
	} else {
		const normal = icons[getIconHash(type, 'normal')];
		ctx.drawImage(normal.img, point.x - normal.svgHeight / 2, point.y - normal.svgHeight / 2);
	}
};
