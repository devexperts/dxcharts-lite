const path = require('path');

const Mocha = require('mocha');

const mochaConfig = require('./.mocharc.js');

// override tsconfig
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../tsconfig.test.json');

mochaConfig.require.forEach(module => {
	require(module);
});

const startTime = Date.now();

function runMocha() {
	console.log('Running tests...');
	const mocha = new Mocha({
		timeout: 20000,
		slow: 10000,
		reporter: mochaConfig.reporter,
		reporterOptions: mochaConfig._reporterOptions,
	});

	if (mochaConfig.checkLeaks) {
		mocha.checkLeaks();
	}

	mocha.diff(mochaConfig.diff);
	mocha.addFile(path.resolve(__dirname, 'memleaktest.ts'));

	mocha.run(failures => {
		console.log(failures);

		const timeInSecs = (Date.now() - startTime) / 1000;
		console.log(`Done in ${timeInSecs.toFixed(2)}s with ${failures} error(s)`);

		process.exitCode = failures !== 0 ? 1 : 0;
	});
}

runMocha();
