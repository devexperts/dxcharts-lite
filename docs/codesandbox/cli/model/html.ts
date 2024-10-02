import * as path from 'path';
import { parse } from 'node-html-parser';
import { filesToCSBPayload, toCSBFilepath } from '.';
import { CodeSandboxPayload, concatCSBPayload } from '../../api/model';
import { getFileContent, getFileName, isHttpLink, replaceInString, toAbsoluteFilepath } from './utils';

const ignorePatterns: string[] = [];

interface HTMLImport {
	filename: string;
	originalFilepath: string;
	absoluteFilepath: string;
}

export const isHTMLFile = (filepath: string) => getFileName(filepath)?.includes('html') ?? false;

export const combineRelativeParsedImportToAbsolute = (htmlFile: string, originalFilepath: string) =>
	path.resolve(htmlFile, `../${originalFilepath}`);

export const parseHTMLImports = (htmlFilepath: string, html: string): HTMLImport[] => {
	const parsedHTML = parse(html);
	// get elements that can store links in their attributes
	const elementsWithLinks = parsedHTML.querySelectorAll('link, script');
	// gettings links from the attributes
	const originalFilepaths = elementsWithLinks.reduce<string[]>((acc, el) => {
		let filepath: string | undefined = undefined;
		switch (el.tagName) {
			case 'LINK':
				const linkTagPath = el.getAttribute('href');
				if (linkTagPath && !isHttpLink(linkTagPath)) {
					filepath = linkTagPath;
				}
				break;
			case 'SCRIPT':
				const scriptTagPath = el.getAttribute('src');
				if (
					scriptTagPath &&
					!isHttpLink(scriptTagPath) &&
					ignorePatterns.every(pattern => !scriptTagPath.includes(pattern))
				) {
					filepath = scriptTagPath;
				}
				break;
		}
		if (!filepath) {
			return acc;
		}
		return acc.concat(filepath);
	}, []);
	const HTMLImports = originalFilepaths.reduce<HTMLImport[]>((acc, filepath) => {
		const filename = getFileName(filepath);

		if (!filename) {
			return acc;
		}

		return acc.concat({
			filename,
			originalFilepath: filepath,
			absoluteFilepath: path.isAbsolute(filepath) ? filepath : toAbsoluteFilepath(htmlFilepath, filepath),
		});
	}, []);

	return HTMLImports;
};

export const replaceHTMLImports = (htmlContent: string, htmlImports: HTMLImport[]) => {
	let replacedHtmlContent = htmlContent;
	htmlImports.forEach(i => {
		replacedHtmlContent = replaceInString(
			replacedHtmlContent,
			i.originalFilepath,
			toCSBFilepath(i.originalFilepath),
		);
	});
	return replacedHtmlContent;
};

export const HTMLFilesToCSBPayload = (htmlFiles: string[]): CodeSandboxPayload => {
	let htmlCSBPayload: CodeSandboxPayload = { files: {} };
	htmlFiles.forEach(htmlFile => {
		const filename = getFileName(htmlFile);

		if (!filename) {
			return;
		}

		const htmlContent = getFileContent(htmlFile);
		const parsedHTMLImports = parseHTMLImports(htmlFile, htmlContent);
		const csbPayloadFromHTMLImports = filesToCSBPayload(
			parsedHTMLImports.map(i => combineRelativeParsedImportToAbsolute(htmlFile, i.originalFilepath)),
		);
		htmlCSBPayload = concatCSBPayload(htmlCSBPayload, csbPayloadFromHTMLImports);

		const htmlContentWithNewImports = replaceHTMLImports(htmlContent, parsedHTMLImports);
		const htmlFileCSBPayload: CodeSandboxPayload = {
			files: { [filename]: { content: htmlContentWithNewImports } },
		};
		htmlCSBPayload = concatCSBPayload(htmlCSBPayload, htmlFileCSBPayload);
	});

	return htmlCSBPayload;
};
