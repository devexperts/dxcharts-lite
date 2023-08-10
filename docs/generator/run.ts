import { generateDedok, generateMethodsTable, generateConfigTable } from './generate-docs';
import * as fs from 'fs';
import * as path from 'path';

const apiReferenceFiles = [
	'ChartComponent',
	'XAxisComponent',
	'YAxisComponent',
	'CrossToolComponent',
	'EventsComponent',
	'VolumesComponent',
	'WaterMarkComponent',
	'NavigationMapComponent',
	'SnapshotComponent',
	'HighlightsComponent',
	'PaneManager',
	'PaneComponent',
];

const LIST_OF_DOC_FILES = [`./src/chart/chart.config.ts`, `./src/chart/components/**/*.component.ts`];

function ensureDirectoryExistence(filePath: string) {
	const dirname = path.dirname(filePath);
	if (fs.existsSync(dirname)) {
		return;
	}
	ensureDirectoryExistence(dirname);
	fs.mkdirSync(dirname);
}

function run() {
	const args = process.argv.slice(2);
	const type = args.length === 0 ? undefined : args[0];

	if (!type || type === 'dedok') {
		const dedokData = generateDedok(LIST_OF_DOC_FILES);

		// generate API reference files
		apiReferenceFiles.forEach(name => {
			const apiFileData = dedokData.find(item => item.name === name);

			if (apiFileData) {
				const fileName = `docs/generated/${name}.md`;
				const output = generateMethodsTable(apiFileData);
				ensureDirectoryExistence(fileName);
				fs.writeFileSync(fileName, output);
			}
		});

		// generate Config file
		const configFileData = dedokData.find(item => item.name === 'FullChartConfig');
		if (configFileData) {
			const fileName = `docs/generated/${'FullChartConfig'}.md`;
			const output = generateConfigTable(configFileData, dedokData);
			ensureDirectoryExistence(fileName);
			fs.writeFileSync(fileName, output);
		}
	}
}

run();
