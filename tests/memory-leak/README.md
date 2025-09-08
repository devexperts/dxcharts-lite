# Memory Leak Tests

This repository contains memory leak tests implemented using Mocha and Puppeteer. The tests are designed to detect memory leaks in the application by checking for extra references after removing a chart.

## Purpose

The purpose of these memory leak tests is to ensure that the application does not have any memory leaks that can lead to increased memory consumption over time. Memory leaks can cause performance degradation and potential crashes in long-running applications.

By running these tests, you can identify any areas of the code or specific scenarios that might be causing memory leaks. The tests provide a metric called "references count," which represents the number of references to a specific object in memory. By comparing the references count before and after a specific action, you can determine if there are any leaks.

## How It Works

The memory leak tests utilize Mocha, a JavaScript testing framework, and Puppeteer, a Node.js library for controlling headless Chrome or Chromium browsers.

The tests simulate the rendering and removal of a chart on a web page. The steps involved are as follows:

1. Launch a headless browser using Puppeteer.
2. Create a new page in the browser for running the tests.
3. Load an initial HTML file (`source.html`) that contains the page setup with the chart.
4. Capture the number of references to the chart object before rendering the full case (`case.html`).
5. Load the full case HTML file(`case.html`), which represents a scenario where the chart is fully rendered on the page.
6. Capture any errors that occur during the page rendering process.
7. Remove the chart from the page and explicitly invoke garbage collection (`gc()`) to free up any unreferenced memory.
8. Capture the number of references to the chart object after removing the chart.
9. Compare the references count before and after the removal of the chart.
10. Fail the test if the references count after removal is different from the references count before rendering.

The tests output the number of failures, execution time, and any errors encountered during the tests.

## Usage

To use the memory leak tests in your own project, follow these steps:

1. Clone the repository:

```shell
git clone <repository-url>
```

2. Install the dependencies and build:

```shell
cd <repository-directory>
yarn install
yarn build
```

3. Run the Tests:

```shell
sh ./tests/memory-leak/run-memory-leak-test.sh
```

This command executes the memory leak tests using Mocha and Puppeteer. The test results will be displayed in the console.

# Interpreting the Metrics

The primary metric used in these memory leak tests is the "references count" of the chart object. The references count represents the number of references to the chart object in memory.

To interpret the metrics, consider the following scenarios:

## Scenario 1: No Memory Leak

References count before rendering: 5
References count after removal: 5
Conclusion: The references count remains the same, indicating that there are no extra references after removing the chart. This suggests that there is no memory leak in this scenario.

## Scenario 2: Memory Leak

References count before rendering: 5
References count after removal: 8
Conclusion: The references count increases after removing the chart, indicating that there are extra references in memory. This suggests the presence of a memory leak.
