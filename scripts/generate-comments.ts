import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as diff from 'diff';
import { exit } from 'process';

const apiToken = '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';

const generateComment = (codeText: string): Promise<string> =>
	fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiToken}`,
		},
		body: JSON.stringify({
			messages: [
				{
					role: 'system',
					content:
						'The user will provide a piece of code and you will have to write a documentation for it in JSDoc format.',
				},
				{ role: 'system', content: "Comment in JSDoc format must contain '*' symbols" },
				{ role: 'system', content: 'You must not repeat the code, you should write only a comment' },
				{ role: 'user', content: codeText },
			],
			model: 'gpt-3.5-turbo',
			temperature: 0.1,
		}),
	})
		.then(response => response.json())
		.then(data => {
			if (data === undefined || data.choices === undefined) {
				console.log(data);
				console.log(codeText);
				exit(-1);
			}
			return data.choices[0].message.content;
		})
		.catch(error => console.log(error));

// Define a strategy for adding comments to your code
const strategy = async (node: ts.Node) => {
	let changed = false;
	if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
		const comments = ts.getSyntheticLeadingComments(node);
		// @ts-ignore
		const jsdoc = node.jsDoc && node.jsDoc[0];
		if (comments === undefined && jsdoc === undefined) {
			// Add a comment describing the functio
			let codeText = node.getFullText();
			codeText = codeText.trim().slice(0, 5000);
			const comment = await generateComment(codeText);
			let commentFormatted = comment.replace('/*', '').replace('*/', '');
			if (!commentFormatted.includes('*')) {
				commentFormatted = `*\n\t * ${commentFormatted}\n\t`;
			}
			ts.addSyntheticLeadingComment(node, ts.SyntaxKind.MultiLineCommentTrivia, commentFormatted, true);
			changed = true;
		}
	}
	return changed;
};

// Traverse the AST and add comments to the code
const visitNode = async (node: ts.Node) => {
	let changed = await strategy(node);
	for (const child of node.getChildren()) {
		const _changed = await visitNode(child);
		if (_changed) {
			changed = _changed;
		}
	}
	return changed;
};

const processTsFile = async (fileName: string, data: string) => {
	console.log(fileName);
	// Parse the TypeScript source file
	const sourceFile = ts.createSourceFile(fileName, data, ts.ScriptTarget.ES5, true);

	const changed = await visitNode(sourceFile);

	// Write the modified source file to disk
	const newData = ts.createPrinter().printFile(sourceFile);
	console.log('processing ' + fileName + ' finished');
	return changed ? newData : data;
};

const preserveNewLines = (oldText: string, newText: string): string => {
	const patch = diff.parsePatch(diff.createPatch('file', oldText, newText, '', ''));
	const hunks = patch[0].hunks;
	for (let i = 0; i < hunks.length; ++i) {
		let lineOffset = 0;
		const hunk = hunks[i];
		hunk.lines = hunk.lines.map(line => {
			if (line === '-') {
				lineOffset++;
				return ' ';
			}
			return line;
		});
		hunk.newLines += lineOffset;
		for (let j = i + 1; j < hunks.length; ++j) {
			hunks[j].newStart += lineOffset;
		}
	}
	return diff.applyPatch(oldText, patch[0]);
};

const walk = async (dir: string) => {
	const files = fs.readdirSync(dir);

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			await walk(filePath);
		} else {
			if (filePath.endsWith('.ts')) {
				const data = fs.readFileSync(filePath, 'utf8');

				const newData = await processTsFile(filePath, data);
				const preservedData = preserveNewLines(data, newData);
				fs.writeFileSync(filePath, preservedData);
			}
		}
	}
};

walk('./src');
