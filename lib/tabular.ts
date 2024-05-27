// tabular.ts is similar to table.ts, but it will test things in a simpler,
// less robust manner, which is hopefully easier to wrap your head around. It
// lives in its own file because it is different enough that putting this code
// side by side with the logic in table.ts would probably lead to confusing.
import { Locator } from '@playwright/test';

type tableObj = string[][];
type locObj = Locator[][];

/**
 * This function converts a locObj into a tableObj. This is useful if you want
 * to compare the string contents of a table to a data structure.
 *
 * @param {locObj} locArray - The locObj to be converted.
 * @return {Promise<tableObj>} - Returns a Promise that resolves to a tableObj.
 */
export const stringify = async function(locArray: locObj): Promise<tableObj> {
    const tableAsString: tableObj = [];
    for (let i = 0; i < locArray.length; i++) {
        const thisRow = locArray[i];
        const newRow: string[] = [];
        for (let j = 0; j < thisRow.length; j++) {
            newRow.push(await thisRow[j].innerText());
        }
        tableAsString.push(newRow);
    }
    return tableAsString;
};

/**
 * This asynchronous function checks if any cell in a table matches a provided
 * string or regular expression. It returns a list containing all of the rows
 * with matches.
 *
 * @param {Locator} table - The table to be checked for matching rows.
 * @param {string | RegExp} matcher - The condition to be matched.
 * @return {Promise<locObj>} - Returns a Promise that resolves to a locObj
 * containing each row which matches the condition. If no matches are found, the
 * locObj will be empty
 */
export const rowMatches = async function(
    table: Locator,
    matcher: string | RegExp,
): Promise<locObj> {
    const tableAsLocs = await tableToLocArray(table);
    const matchingRows = [];
    for (const row of tableAsLocs) {
        const isMatch = await Promise.all(
            row.map(async (cell) => {
                const inner = await cell.innerText();
                if (typeof matcher === 'string') {
                    return inner === matcher;
                } else {
                    return matcher.test(inner);
                }
            })
        );
        if (isMatch.some(Boolean)) {
            matchingRows.push(row);
        }
    }
    return matchingRows;
};

/**
 * This asynchronous function converts a table locator into a tableObj.
 *
 * @param {Locator} table - The table locator to be converted.
 * @return {Promise<tableObj>} - Returns a Promise that resolves to a tableObj.
 */
export const tableToArray = async function(table: Locator): Promise<tableObj> {
    const tableAsLocs = await tableToLocArray(table);
    const tableAsStrings: tableObj = [];

    for (let i = 0; i < tableAsLocs.length; i++) {
        const thisRow = tableAsLocs[i];
        const newRow: string[] = [];
        for (let j = 0; j < thisRow.length; j++) {
            newRow.push(await thisRow[j].innerText());
        }
        tableAsStrings.push(newRow);
    }

    return tableAsStrings;
};

/**
 * This asynchronous function converts a table locator into a locObj.
 *
 * @param {Locator} table - The table locator to be converted.
 * @return {Promise<locObj>} - Returns a Promise that resolves to a locObj.
 */
export const tableToLocArray = async function(table: Locator): Promise<locObj> {
    const tableAsLocs: locObj = [];

    const rows = table.getByRole('row');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const cells = row.getByRole('cell');
        const cellCount = await cells.count();
        const thisRow: Locator[] = [];

        for (let j = 0; j < cellCount; j++) {
            const cell = cells.nth(j);
            thisRow.push(cell);
        }

        tableAsLocs.push(thisRow);
    }

    return tableAsLocs;
};

