/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as ts from 'typescript';
import * as glob from 'glob';
import { toTsCode, removeSpaces, createTableRow } from './md-font-utils';

export interface DedokMethodParam {
	name: string;
	comment?: string;
	type: string;
}

export interface DedokEntry {
	name: string;
	fileName?: string;
	comment?: string;
	type?: string;
	props?: DedokProp[];
	methods?: DedokMethod[];
}

export interface DedokProp {
	name: string;
	fqn: string;
	type1: string;
	type2: string;
	typeLiteral: boolean;
	optional?: boolean;
	comment?: string;
	hasTypeLink?: boolean; // true if type was generated in dedok as well
}

export interface DedokMethod {
	name: string;
	comment?: string;
	parameters?: DedokMethodParam[];
	returnType?: string;
	publicKeyword?: boolean;
}

interface DedokTableRow {
	name: string;
	description?: string;
	type: string;
	hasNesting: boolean;
	children?: DedokTableRow[];
}

const COMPILER_OPTIONS: ts.CompilerOptions = {
	target: ts.ScriptTarget.ES5,
	module: ts.ModuleKind.CommonJS,
};
/**
 * Generate documentation for all classes in a set of .ts files
 * @doc-tags dedok
 */
export function generateDedok(listOfFiles: string[]): DedokEntry[] {
	console.log('Generating dedok...');
	const fileList: string[] = listOfFiles.flatMap(pattern => glob.sync(pattern, {}));
	const program = ts.createProgram(fileList, COMPILER_OPTIONS);
	const checker = program.getTypeChecker();
	const output: DedokEntry[] = [];

	// Visit every sourceFile in the program
	for (const sourceFile of program.getSourceFiles()) {
		if (!sourceFile.isDeclarationFile) {
			ts.forEachChild(sourceFile, visit);
		}
	}

	// find out which entries have links to others
	const allNames = output.map(entry => entry.name);
	output.forEach(entry => {
		if (entry.props) {
			entry.props.forEach((prop: any) => {
				if (allNames.indexOf(prop.type1) !== -1) {
					prop.hasTypeLink = true;
				}
			});
		}
	});

	return output;

	/** visit nodes finding exported classes */
	function visit(node: ts.Node) {
		// Only consider exported nodes
		if (!isNodeExported(node)) {
			return;
		}

		if (ts.isInterfaceDeclaration(node) && node.name) {
			output.push(serializeInterface(node));
			// No need to walk any further, class expressions/inner declarations
			// cannot be exported
		} else if (ts.isModuleDeclaration(node)) {
			// This is a namespace, visit its children
			ts.forEachChild(node, visit);
		} else if (ts.isClassDeclaration(node) && node.name) {
			// TODO HERE STARTS FORMER API-REFERENCE LOGIC
			// This is a top level class, get its symbol
			let symbol = checker.getSymbolAtLocation(node.name);
			if (symbol) {
				//need localSymbol for the name, if there is one because otherwise exported as "default"
				symbol = symbol.valueDeclaration?._declarationBrand
					? symbol.valueDeclaration?._declarationBrand
					: symbol;

				if (!symbol) {
					return;
				}

				const details = serializeClass(symbol);

				const classEntry: DedokEntry = {
					name: details.name,
					comment: details.comment,
					methods: [],
				};
				ts.forEachChild(node, node => visitClass(node, classEntry));
				output.push(classEntry);
			}
		}
	}

	function visitClass(node: ts.Node, classEntry: DedokEntry) {
		if (ts.isMethodDeclaration(node)) {
			const symbol = checker.getSymbolAtLocation(node.name);
			if (symbol) {
				const currentMethod = serializeMethod(symbol);
				if (classEntry.methods) {
					classEntry.methods.push(currentMethod);
				}
			}
			ts.forEachChild(node, visit);
		}
	}

	/** Serialize interface */
	function serializeInterface(node: ts.InterfaceDeclaration) {
		const symbol = checker.getSymbolAtLocation(node.name);
		const name = symbol?.getName() || '';
		const documentation = symbolDocumentation(symbol);
		const result: DedokEntry = {
			name,
			comment: documentation,
		};

		const props: Array<DedokProp> = [];
		const methods: Array<DedokMethod> = [];

		// find all members, including super-types
		const nodeMembers: ts.Node[] = node.members.map(m => m);
		const superTypeMembers: ts.Node[] = findMembersInHeritage(checker, node);
		const members: ts.Node[] = nodeMembers.concat(superTypeMembers);
		members.forEach(prop => {
			if (ts.isPropertySignature(prop)) {
				const propSymbol = checker.getSymbolAtLocation(prop.name);
				if (propSymbol) {
					// const declaredTypeOfSymbol = checker.getDeclaredTypeOfSymbol(propSymbol);
					const name = propSymbol.getName();
					const fqn = checker.getFullyQualifiedName(propSymbol);
					const propType = checker.getTypeOfSymbolAtLocation(propSymbol, propSymbol.valueDeclaration!);
					const propTypeNode = checker.typeToTypeNode(propType, undefined, undefined);
					const typeLiteral = propTypeNode ? ts.isTypeLiteralNode(propTypeNode) : false;
					const type1 = symbolTypeToString(propSymbol);
					const type2 = prop.type?.getText() || '';
					// const propertiesOfType = checker.getPropertiesOfType(declaredTypeOfSymbol);
					props.push({
						name,
						fqn,
						type1,
						type2,
						typeLiteral,
						optional: prop.questionToken !== undefined,
						comment: symbolDocumentation(propSymbol),
					});
				}
			} else if (ts.isMethodSignature(prop)) {
				const propSymbol = checker.getSymbolAtLocation(prop.name);
				if (propSymbol) {
					const name = propSymbol.getName();
					// eslint-disable-next-line no-restricted-syntax
					const signatureFromDeclaration = checker.getSignatureFromDeclaration(prop) as ts.Signature;
					const parameters = signatureFromDeclaration.parameters.map(param => {
						return {
							name: param.getName(),
							comment: symbolDocumentation(param),
							type: symbolTypeToString(param),
						};
					});
					// eslint-disable-next-line no-restricted-syntax
					const returnTypeOfSignature = checker.getReturnTypeOfSignature(signatureFromDeclaration) as ts.Type;
					methods.push({
						name,
						comment: symbolDocumentation(propSymbol),
						parameters,
						returnType: typeToString(returnTypeOfSignature),
					});
				}
			}
		});

		result.props = props;
		result.methods = methods;
		return result;
	}

	function symbolTypeToString(symbol: ts.Symbol): string {
		const type = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);
		return typeToString(type);
	}

	function typeToString(type: ts.Type): string {
		return checker.typeToString(type, undefined, ts.TypeFormatFlags.UseStructuralFallback);
	}

	function symbolDocumentation(symbol?: ts.Symbol) {
		return ts.displayPartsToString(symbol?.getDocumentationComment(checker));
	}

	/** True if this is visible outside this file, false otherwise */
	function isNodeExported(node: ts.Node): boolean {
		return (
			// eslint-disable-next-line no-restricted-syntax,no-bitwise
			(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
			(!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
		);
	}

	// TODO HERE STARTS FORMER API-REFERENCE LOGIC
	/** Serialize a class symbol information */
	function serializeClass(symbol: ts.Symbol) {
		return serializeSymbol(symbol);
	}

	function serializeMethod(symbol: ts.Symbol) {
		let details = serializeSymbol(symbol);
		// Get the construct signatures
		const methodType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!);

		const callingDetails = methodType.getCallSignatures().map(serializeSignature)['0'];
		details = { ...details, ...callingDetails };
		return details;
	}

	/** Serialize a symbol into a json object */
	function serializeSymbol(symbol: ts.Symbol): DedokEntry {
		const tags = symbol.getJsDocTags();
		let tagMap: any = undefined;
		// eslint-disable-next-line no-restricted-globals
		if (tags?.length) {
			// eslint-disable-next-line @typescript-eslint/prefer-for-of
			for (let i = 0; i < tags.length; i++) {
				const tag = tags[i];
				if (tag.name !== 'param') {
					tagMap = tagMap ? tagMap : {};
					tagMap[tag.name] = tag.text;
				}
			}
		}
		return {
			name: symbol.getName(),
			comment: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
			type: checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)),
		};
	}

	/** Serialize a signature (call or construct) */
	function serializeSignature(signature: ts.Signature) {
		if (!signature.declaration) {
			return {};
		}

		if (signature.declaration.kind === ts.SyntaxKind.MethodDeclaration) {
			let publicKeyword = false;
			if (signature.declaration.modifiers && signature.declaration.modifiers[0]) {
				publicKeyword = signature.declaration.modifiers[0].kind === ts.SyntaxKind.PublicKeyword;
			}

			return {
				publicKeyword,
				parameters: signature.parameters.map(serializeSymbol),
				returnType: checker.typeToString(signature.getReturnType()),
				comment: ts.displayPartsToString(signature.getDocumentationComment(checker)),
			};
		} else {
			return {};
		}
	}
}

/**
 * Finds all members in super types.
 **/
function findMembersInHeritage(checker: ts.TypeChecker, node: ts.InterfaceDeclaration) {
	const newVar =
		node.heritageClauses?.flatMap((heritage: ts.HeritageClause) => {
			if (heritage.token !== ts.SyntaxKind.ExtendsKeyword || !heritage.types) {
				return [];
			}
			return heritage.types.flatMap(tn => {
				const type = checker.getTypeFromTypeNode(tn);
				const members: ts.Declaration[] = [];
				type.getSymbol()?.members?.forEach(v => {
					// @ts-ignore
					const declaration = v.getDeclarations()[0];
					members.push(declaration);
				});
				return members;
			});
		}) || [];
	return newVar;
}

export function generateMethodsTable(item: DedokEntry) {
	const title = `# ${item.name}\n`;
	const comment = `${item.comment || ''}\n\n`;
	const tableHead = createTableRow(['Method', 'Parameters', 'Returns', 'Description']);
	const tableDivider = createTableRow(['---', '---', '---', '---']);
	const tableContent = item.methods
		? item.methods.reduce((acc: string, method: DedokMethod) => {
				const parameters = method.parameters
					? method.parameters.reduce(
							(acc, param: DedokMethodParam) =>
								acc + `${toTsCode(param.name + ': ' + param.type)} ${removeSpaces(param.comment)}`,
							'',
					  )
					: '';

				return (
					acc +
					createTableRow([
						toTsCode(method.name),
						parameters,
						toTsCode(method.returnType),
						removeSpaces(method.comment),
					])
				);
		  }, '')
		: '';

	return title + comment + tableHead + tableDivider + tableContent;
}

export function generateConfigTable(configItem: DedokEntry, dedokData: DedokEntry[]) {
	const generatedTables: string[] = [];

	const createRowsHierarchy = (entry: DedokEntry) => {
		return entry.props?.map(prop => {
			const row: DedokTableRow = {
				name: prop.name,
				description: prop.comment,
				type: prop.type1,
				hasNesting: false,
			};
			if (prop.hasTypeLink === true) {
				const entryChildren: DedokEntry | undefined = dedokData.find(item => item.name === prop.type1);
				row.children = entryChildren?.props ? createRowsHierarchy(entryChildren) : undefined;
				row.hasNesting = Boolean(row.children?.length) && prop.hasTypeLink === true;
			}
			return row;
		});
	};

	const table: DedokTableRow = {
		name: configItem.name,
		description: configItem.comment,
		type: 'FullChartConfig',
		hasNesting: true,
		children: createRowsHierarchy(configItem),
	};

	const createTable = (item: DedokTableRow) => {
		const type = `### ${toTsCode(item.type)}\n`;
		const comment = `${item.description || ''}\n\n`;
		const tableHead = createTableRow(['Property', 'Description', 'Type']);
		const tableDivider = createTableRow(['---', '---', '---']);
		const tableContent =
			item.hasNesting && item.children?.length
				? item.children.reduce(
						(acc: string, row: DedokTableRow): string =>
							acc +
							createTableRow([
								toTsCode(row.name),
								removeSpaces(row.description),
								row.hasNesting
									? // create link for nested table
									  `[${toTsCode(row.type)}](#${row.type.toLowerCase()})`
									: toTsCode(row.type),
							]),
						'',
				  )
				: '';

		generatedTables.push(`${type}${comment}${tableHead}${tableDivider}${tableContent}`);

		if (item.hasNesting && item.children?.length) {
			item.children.forEach((row: DedokTableRow) => {
				if (row.hasNesting) {
					createTable(row);
				}
			});
		}
	};

	createTable(table);

	return generatedTables.join('\n');
}
