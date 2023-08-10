export const toTsCode = (str: string | undefined) => (str ? `\`${str}\`` : '');
export const toBoldFont = (str: string | undefined) => (str ? `**${str}**` : '');
export const removeSpaces = (str: string | undefined) => (str ? str.replace('\n', ' ') : '');
export const createTableRow = (cells: string[]): string => {
	return cells.reduce((generatedRow, cell, index) => {
		return generatedRow + cell + '|' + (index === cells.length - 1 ? '\n' : '');
	}, '|');
};
