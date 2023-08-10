import * as fs from 'fs';
import { getFileContent } from './utils';

export const CSB_LINK = 'CSB_LINK';
const CSB_LINK_OPEN_TAG = `<!--${CSB_LINK}-->`;
const CSB_LINK_CLOSING_TAG = `<!--/${CSB_LINK}-->`;

export const replaceMDCSBLink = (fileContent: string, link: string) => {
	const csbOpenTagIndex = fileContent.indexOf(CSB_LINK_OPEN_TAG);
	const csbCloseTagIndex = fileContent.indexOf(CSB_LINK_CLOSING_TAG);

	if (csbOpenTagIndex === -1 || csbCloseTagIndex === -1) {
		return fileContent;
	}

	const contentBetweenTags = fileContent.slice(csbOpenTagIndex + CSB_LINK_OPEN_TAG.length, csbCloseTagIndex);
	const linkStartBracket = contentBetweenTags.indexOf('(');
	const linkEndBracket = contentBetweenTags.indexOf(')');

	if (linkStartBracket === -1 || linkEndBracket === -1) {
		return fileContent;
	}

	return (
		fileContent.slice(0, csbOpenTagIndex + CSB_LINK_OPEN_TAG.length + linkStartBracket) +
		`(${link})` +
		fileContent.slice(csbCloseTagIndex)
	);
};

export const writeMDCSBLink = (mdFiles: string[], sandboxURL: string) => {
	mdFiles.forEach(f => {
		let mdFileContent = getFileContent(f);
		mdFileContent = replaceMDCSBLink(mdFileContent, sandboxURL);
		fs.writeFileSync(f, mdFileContent);
	});
};
