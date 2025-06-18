/*
 * Copyright (C) 2019 - 2025 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Formats price values for US Treasury contracts in 32nds format
 *
 * Examples:
 *
 * 132.015625 => 132'00 (0.015625 = 0.5/32)
 * 132.0625 => 132'02 (0.0625 = 2/32)
 *
 */

export const TREASURY_32ND = 1 / 32; // 0.03125

export const treasuryPriceFormatter = (value: number): string => {
	const integerValue = Math.floor(value);

	// Get the decimal part and convert to 64ths
	const decimalPart = value - integerValue;
	const sixtyFourths = Math.round(decimalPart * 64);

	// Calculate 32nds and half
	const thirtySeconds = Math.floor(sixtyFourths / 2);

	// Format the 32nds part to always show 2 digits (00-31)
	const thirtySecondsFormatted = thirtySeconds.toString().padStart(2, '0');

	return `${integerValue}'${thirtySecondsFormatted}`;
};
