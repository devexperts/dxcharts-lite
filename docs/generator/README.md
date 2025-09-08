This folder contains scripts, that are used to generate documentation from code.

**Dedok** - transforms code into documentation

Think of it as **JSDoc** but for _TypeScript_

## How it works
Dedok parses TypeScripts **AST** and generated JSON object which represents TS nodes

This script takes a list of TypeScript files, parses them, and generates data of interfaces found in them. The data is then used to create tables in markdown (.md) files. The tables include the name, type, and description of each interface. This makes it easy to visualize and understand the interfaces defined in the TypeScript files.

To achieve this, the script uses the TypeScript Compiler API to traverse the AST (Abstract Syntax Tree) of each file. It extracts information about the exported classes and interfaces, and serializes them. The resulting data includes information about interfaces' names, comments, properties, and methods.

The interfaces are represented by the `DedokEntry` interface, which has properties like `name`, `fileName`, `comment`, `type`, `props`, and `methods`. These interfaces, properties, and methods are parsed from the TypeScript files using the TypeScript compiler API.

```ts
...
interface DedokEntry {
	name: string;
	fileName?: string;
	comment?: string;
	type?: string;
	props?: {
		name: string;
		fqn: string;
		type1: string;
		type2: string;
		typeLiteral: boolean;
		optional?: boolean;
		comment?: string;
		hasTypeLink?: boolean;
	}[];
	methods?: {
		name: string;
		comment?: string;
		parameters?: {
			name: string;
			comment?: string;
			type: string;
		}[];
		returnType?: string;
		publicKeyword?: boolean;
	}[];
}
```

Example:

```json
{
    "name": "FullChartConfig",
    "comment": "The main configuration file for chart-core.\r\nIncludes all components' configurations, global configs like dateFormatter, and colors.",
    "props": [
        {
            "name": "scale",
            "fqn": "\"../chart/js/chart/ChartConfig\".FullChartConfig.scale",
            "type1": "ChartScale",
            "type2": "ChartScale",
            "typeLiteral": false,
            "optional": false,
            "comment": "Controls how chart series are positioned horizontally and vertically.\r\nOther configurations like: inverse, fit studies, lockRatio.",
            "hasTypeLink": true
        },
        ...
    "methods": [],
}
```

After you have got TS nodes, you can use them to make tables, hierarchical tree or other visual template approach.

|Method|Parameters|Returns|Description|
|---|---|---|---|
|`someMethod`||`void`|This method is used to return nothing :grinning:|
|`someAnotherMethod`|`callback: (a: number) => void` |`Promise<boolean>`|This method is used to return Promise|
