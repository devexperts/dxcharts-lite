import { CodeSandboxPayload, RequestCodeSandboxExample } from './model';

export const getCodeSandboxFetchConfig = (v: CodeSandboxPayload) => ({
	url: 'https://codesandbox.io/api/v1/sandboxes/define?json=1',
	method: 'POST',
	crossDomain: true,
	headers: {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	},
	body: JSON.stringify(v),
});

export const requestCodeSandboxExample: RequestCodeSandboxExample = (
	config: ReturnType<typeof getCodeSandboxFetchConfig>,
) => fetch(config.url, { ...config }).then(res => res.json());

export const getCodeSandboxURL = (sandboxId: string) => `https://codesandbox.io/s/${sandboxId}`;

export const getCodeSandboxFileURL = (sandboxId: string, filepath: string) =>
	`https://codesandbox.io/s/${sandboxId}?file=/${filepath}`;
