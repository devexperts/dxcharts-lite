import * as fs from 'fs';
import { globSync } from 'glob';
import * as path from 'path';
import * as esbuild from 'esbuild';

async function minifyFile(file: string): Promise<void> {
	const fileContent = fs.readFileSync(file, 'utf-8');

	const result = await esbuild.transform(fileContent, {
		minify: true,
		minifyWhitespace: true,
		minifyIdentifiers: true,
		minifySyntax: true,
		target: 'es2016',
	});

	if (result.code) {
		return Promise.resolve(fs.writeFileSync(file, result.code));
	}

	return Promise.resolve();
}

function minify(): void {
	const jsFiles = globSync(path.resolve(`dist/**/*.js`));

	console.log('Library minification started...');

	Promise.all(
		jsFiles.map(file => {
			// do not minify bundle
			if (file.indexOf('.min.js') !== -1 || file.indexOf('.dev.js') !== -1) {
				return;
			}
			return minifyFile(file);
		}),
	);

	console.log('Library minification finished!');
}

minify();
