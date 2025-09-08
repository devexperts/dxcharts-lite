import * as glob from 'glob';
import * as fs from 'fs';
import * as packageJson from '../package.json';

const version = packageJson.version;
const readmeFile = glob.sync('./README.md')[0];
const fileContent = fs.readFileSync(readmeFile, 'utf-8');

const header = fileContent.split('\n')[0];
const allOtherContent = fileContent.split(header)[1];
// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
const newHeader = `# DXCharts Lite [![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0) [![PRs: Welcome](https://img.shields.io/static/v1?label=PRs&message=Welcome&color=blue)](https://devexperts.com/kb/dxcharts/docs/how-to-contribute) [![Version](https://img.shields.io/static/v1?label=Latest%20version&message=${version}&color=blue)](https://devexperts.com/dxcharts-demo/?lang=en)`;
const updatedReadme = newHeader + allOtherContent;
fs.writeFileSync(readmeFile, updatedReadme);
