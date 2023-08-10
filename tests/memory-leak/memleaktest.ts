import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import { Browser, Page, JSHandle, launch as launchPuppeteer } from 'puppeteer';

const initialFile = fs.readFileSync(path.join(__dirname, '../../dist/test/source.html'), { encoding: 'utf-8' });

const fullCaseFile = fs.readFileSync(path.join(__dirname, '../../dist/test/case.html'), { encoding: 'utf-8' });

async function getReferencesCount(page: Page, prototypeReference: JSHandle, sec: boolean): Promise<number> {
	const activeRefsHandle = await page.queryObjects(prototypeReference);

	const numberOfObjects = await page.evaluate(instances => instances.length, activeRefsHandle);
	sec && (await prototypeReference.dispose());
	await activeRefsHandle.dispose();

	return numberOfObjects;
}

/* function promisleep(ms: number): Promise<void> {
	return new Promise((resolve: () => void) => {
		setTimeout(resolve, ms);
	});
} */

describe('Memleaks tests', () => {
	let browser: Browser;

	before(async () => {
		const puppeteerOptions: Parameters<typeof launchPuppeteer>[0] = {};

		puppeteerOptions.args = ['--no-sandbox', '--disable-setuid-sandbox', '--js-flags=--expose-gc'];
		browser = await launchPuppeteer(puppeteerOptions);
	});

	it('Render and remove chart', async () => {
		const page = await browser.newPage();

		await page.setViewport({ width: 600, height: 600 });

		// set page with chart as initail
		await page.setContent(initialFile, { waitUntil: 'domcontentloaded' });

		const errors: string[] = [];

		page.on('pageerror', (error: Error) => {
			errors.push(error.message);
		});

		const getCanvasPrototype = () => {
			return Promise.resolve(Object.prototype);
		};

		const prototype = await page.evaluateHandle(getCanvasPrototype);
		const referencesCountBefore = await getReferencesCount(page, prototype, false);
		console.log('referencesCountBefore', referencesCountBefore);

		await page.setContent(fullCaseFile, { waitUntil: 'domcontentloaded' });

		if (errors.length !== 0) {
			throw new Error(`Page has errors:\n${errors.join('\n')}`);
		}

		// now remove chart
		await page.evaluate(() => {
			//@ts-ignore
			window.CHART.destroy();
			//@ts-ignore
			window.document.querySelector('div').remove();
			//@ts-ignore
			gc();
		});

		/* 	// IMPORTANT: This timeout is important
		// Browser could keep references to DOM elements several milliseconds after its actual removing
		// So we have to wait to be sure all is clear
		await promisleep(100); */

		const referencesCountAfter = await getReferencesCount(page, prototype, true);
		console.log('referencesCountAfter', referencesCountAfter);

		expect(referencesCountAfter).to.be.equal(
			referencesCountBefore,
			'There should not be extra references after removing a chart',
		);
	});

	after(async () => {
		await browser.close();
	});
});
