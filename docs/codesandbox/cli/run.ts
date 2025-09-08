import * as commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { generateSandbox } from './model';
import { writeMDCSBLink } from './model/md';
import { getFileName, isMDFile } from './model/utils';

const program = new commander.Command();

const ignorePatterns = ['codesandbox', 'generated', 'generator'];

/**
 * Generates a sandboxes for docs folder
 * @see
 * It has a smart parser for HTML files (imports handling and so on), md file is needed
 * to replace the sandbox url placeholder.
 * @see
 * Ignores all the extra files.
 */
program
	.name('generate_sandbox')
	.description('Generates a sandboxes for the docs')
	.argument('[dir]', 'docs folder', 'Folder where docs are contained is required!')
	.action(function (dir: string) {
		console.log('👷 Started generation...');

		const examplesFolders = fs
			.readdirSync(dir)
			.map(filepath => path.resolve(dir, filepath))
			.filter(filepath => fs.lstatSync(filepath).isDirectory())
			.filter(filepath => ignorePatterns.every(pattern => !filepath.includes(pattern)));

		if (!examplesFolders.length) {
			console.log('❌ Folders with examples were not found!');
			return;
		}

		Promise.all(
			examplesFolders.map(folder => {
				const files = fs
					.readdirSync(folder)
					.map(filepath => path.resolve(folder, filepath))
					.filter(path => fs.lstatSync(path).isFile());
				const folderName = getFileName(folder);

				return generateSandbox(files)
					.then(sandboxURL => {
						const mdFiles = files.filter(isMDFile);
						if (mdFiles.length) {
							writeMDCSBLink(mdFiles, sandboxURL);
						}
						return sandboxURL;
					})
					.then(sandboxURL => {
						console.log(
							`${folderName ? `/${folderName}/: ` : ''}✅ Sandbox generated! [🔗 sandbox URL:`,
							sandboxURL,
							']',
						);
					});
			}),
		).then(() => {
			console.log('🏁 Generation complete!');
		});
	});

program.parse(process.argv);
