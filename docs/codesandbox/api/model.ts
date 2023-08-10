import { getCodeSandboxFetchConfig } from './api';

export type Json = boolean | number | string | null | Json[] | JsonRecord;

export interface JsonRecord {
	readonly [key: string]: Json;
}

export interface CodeSandboxContent {
	readonly content: Json;
}

export type CodeSandboxFiles = Record<string | 'package.json', CodeSandboxContent>;

export interface CodeSandboxPayload {
	readonly files: CodeSandboxFiles;
}

export interface RequestCodeSandboxExampleResponse {
	sandbox_id: string;
}

export type RequestCodeSandboxExample = (
	config: ReturnType<typeof getCodeSandboxFetchConfig>,
) => Promise<RequestCodeSandboxExampleResponse>;

export const concatCSBPayload = (csbPayload1: CodeSandboxPayload, csbPayload2: CodeSandboxPayload) => {
	return {
		files: {
			...csbPayload1.files,
			...csbPayload2.files,
		},
	};
};

export const addPackageJSONToCodeSandboxPayload = (payload: CodeSandboxPayload): CodeSandboxPayload => {
	return concatCSBPayload(payload, {
		files: {
			'package.json': {
				content: {
					name: 'dxcharts-lite example',
					version: '1.0.0',
					dependencies: {},
				},
			},
		},
	});
};

export const addCodeSandboxConfigToCSBPayload = (payload: CodeSandboxPayload): CodeSandboxPayload => {
	return concatCSBPayload(payload, {
		files: {
			'sandbox.config.json': {
				content: {
					template: 'static',
				},
			},
		},
	});
};
