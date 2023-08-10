import { getCodeSandboxFetchConfig, getCodeSandboxURL, requestCodeSandboxExample } from '../../api/api';
import {
	addCodeSandboxConfigToCSBPayload,
	addPackageJSONToCodeSandboxPayload,
	CodeSandboxPayload,
} from '../../api/model';
import { HTMLFilesToCSBPayload, isHTMLFile } from './html';
import { getFileContent, getFileName, getFilePaths } from './utils';

export const filesToCSBPayload = (filepaths: string[]) => {
	return filepaths.reduce<CodeSandboxPayload>(
		(acc, filepath) => {
			const filename = getFileName(filepath);

			if (!filename) {
				return acc;
			}

			const fileContent = getFileContent(filepath);

			acc.files[filename] = { content: fileContent };

			return acc;
		},
		{ files: {} },
	);
};

export const toCSBFilepath = (filepath: string) => `./${getFileName(filepath) ?? ''}`;

// Generates a sandbox for a given HTML files.
export function generateSandbox(src: string[]): Promise<string> {
	const files = getFilePaths(src);

	// working on html files
	const htmlFiles = files.filter(isHTMLFile);
	const htmlCSBPayload = HTMLFilesToCSBPayload(htmlFiles);
	const csbPayloadWithConfigs = addCodeSandboxConfigToCSBPayload(addPackageJSONToCodeSandboxPayload(htmlCSBPayload));

	const requestConfig = getCodeSandboxFetchConfig(csbPayloadWithConfigs);

	return requestCodeSandboxExample(requestConfig).then(res => getCodeSandboxURL(res.sandbox_id));
}
