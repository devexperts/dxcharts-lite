/*
 * Copyright (C) 2019 - 2024 Devexperts Solutions IE Limited
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
let isMobileCache: boolean | undefined;
let userAgentCache: string | undefined;
/**
 * @doc-tags utility,mobile
 */
export const isMobile = () => {
	if (typeof navigator === 'undefined') {
		return false;
	}

	const currentUserAgent = navigator.userAgent;
	if (userAgentCache !== currentUserAgent || isMobileCache === undefined) {
		userAgentCache = currentUserAgent;
		isMobileCache = !!currentUserAgent.match(/Android|iPhone|Opera Mini/);
	}
	return isMobileCache;
};
