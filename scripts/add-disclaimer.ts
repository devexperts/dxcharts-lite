import * as glob from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import * as commander from 'commander';
import * as isGlob from 'is-glob';

const program = new commander.Command();

program
	.name('add_disclaimer')
	.description('Adds a disclaimer at the top of the file')
	.argument('[src...]', 'files to add disclaimer to', ['dist/**/*.[jt]s'])
	.action(function (src: string[]) {
		const files = src
			.map(filepath => {
				if (isGlob(filepath)) {
					return glob.sync(path.resolve(filepath));
				}
				return path.resolve(filepath);
			})
			.flat();
		const currentYear = new Date().getFullYear();
		const prevYear = new Date().getFullYear() - 1;
		const getDisclaimerText = (fullYear: number) => `/*
 * Copyright (C) 2002 - ${fullYear} Devexperts LLC
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */`;
		const disclaimerTextCurrentYear = getDisclaimerText(currentYear);
		const disclaimerTextPrevYear = getDisclaimerText(prevYear);

		const addDisclaimerToFile = (file: string) => {
			const fileContent = fs.readFileSync(file, 'utf-8');

			// if disclaimer already set in file - skip
			if (fileContent.indexOf(disclaimerTextCurrentYear) !== -1) {
				return;
			}

			let result: string = '';

			// if disclaimer set for the prev year => replace it with current year
			if (fileContent.indexOf(disclaimerTextPrevYear) !== -1) {
				result = fileContent.replace(disclaimerTextPrevYear, disclaimerTextCurrentYear);
			} else {
				// if no disclaimer found => add it to the head of the file
				const splittedFileContent = fileContent.toString().split('\n');
				splittedFileContent.splice(0, 0, `${disclaimerTextCurrentYear}`);
				result = splittedFileContent.join('\n');
			}

			fs.writeFileSync(file, result);
		};

		files.forEach(addDisclaimerToFile);
	});

program.parse(process.argv);
