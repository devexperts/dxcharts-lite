import * as fs from 'fs';
import * as isGlob from 'is-glob';
import * as glob from 'glob';
import * as path from 'path';

export const toAbsoluteFilepath = (basePart: string, relativePart: string) => {
	const stack = basePart.split('/');
	const relativeParts = relativePart.split('/');
	// remove current file name (or empty string)
	// (omit if "base" is the current folder without trailing slash)
	stack.pop();
	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < relativeParts.length; i++) {
		if (relativeParts[i] === '.') {
			continue;
		}
		if (relativeParts[i] === '..') {
			stack.pop();
		} else {
			stack.push(relativeParts[i]);
		}
	}
	return stack.join('/');
};

export const getFilePaths = (src: string[]) => {
	return src
		.map(filepath => {
			if (isGlob(filepath)) {
				return glob.sync(path.resolve(filepath));
			}
			return path.resolve(filepath);
		})
		.flat();
};

export const getFileName = (filepath: string) => filepath.split(/(\\|\/)/g).pop();

export const getFileExtension = (filename: string) => filename.split('.').pop();

export const getFileContent = (file: string) => {
	return fs.readFileSync(file, 'utf-8');
};

export const isHttpLink = (link: string) => link.includes('http');

export const isMDFile = (filepath: string) => getFileName(filepath)?.includes('md') ?? false;

export const replaceInString = (str: string, toReplaceValue: string, replaceValue: string) => {
	const start = str.indexOf(toReplaceValue);
	if (start !== -1) {
		return str.slice(0, start) + replaceValue + str.slice(start + toReplaceValue.length);
	}

	return str;
};

// TODO: Improve file extensions grouping
// const assignToArrayInObject = <T extends Record<string, any[]>>(o: T, key: string, val: any) => {
// 	const defined = o[key];
// 	if (defined) {
// 		// TODO: fix typings
// 		//@ts-ignore
// 		o[key] = [...defined, val];
// 		return o;
// 	}
// 	// TODO: fix typings
// 	//@ts-ignore
// 	o[key] = [val];
// 	return o;
// };

// type GroupedFiles = Record<string, string[]>;

// export const groupFiles = (files: string[]): GroupedFiles => {
// 	const groups: GroupedFiles = {};

// 	files.forEach(f => {
// 		const filename = getFileName(f);

// 		if (!filename) {
// 			return;
// 		}

// 		const fileExt = getFileExtension(filename);

// 		if (!fileExt) {
// 			return;
// 		}

// 		assignToArrayInObject(groups, fileExt, f);
// 	});

// 	return groups;
// };
