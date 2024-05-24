import { expect, Locator, test } from '@playwright/test';
import path from 'path';

type tableObj = string[][];
type locObj = Locator[][];

test('parse table', async ({ page }) => {
    const filePath = path.join(process.cwd(), 'test-data/table.html');
    await page.goto(`file://${filePath}`);
    const found = page.getByRole('table');
    const table = await tableToArray(found);
    expect(table).toEqual([
        ['First Name', 'Last Name'],
        ['Jackson', 'Lamb'],
        ['River', 'Cartwright'],
    ]);

    const locTable = await tableToLocArray(found);
    expect(await locTable[0][0].innerHTML()).toEqual('First Name');

    const match = await rowMatch(found, 'River');
    expect(await match[0].innerHTML()).toEqual('River');
    expect(await match[1].innerHTML()).toEqual('Cartwright');
});

// rowMatch is a function that
// * receives Locator which is an HTML table
// runs tableToLocArray
// returns the row from the table where the first cell matches the provided value

const rowMatch = async function (table: Locator, value: string): Promise<Locator[]> {
    const locTable = await tableToLocArray(table);
    const rowWithMatchingValue = await Promise.all(
        locTable.map(async (row) => {
            const innerHTML = await row[0].innerHTML();
            return innerHTML === value ? row : null;
        }),
    ).then((rows) => rows.find((row) => row !== null));
    return rowWithMatchingValue;
}

const tableToArray = async function (table: Locator): Promise<tableObj> {
    let locTable = await tableToLocArray(table);
    let asObj: tableObj = [];

    for (let i = 0; i < locTable.length; i++) {
        const thisRow = locTable[i];
        const newRow: string[] = [];
        for (let j = 0; j < thisRow.length; j++) {
            newRow.push(await thisRow[j].innerHTML());
        }
        asObj.push(newRow);
    }

    return asObj;
}

const tableToLocArray = async function (table: Locator): Promise<locObj> {
    let asObj: locObj = [];

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

        asObj.push(thisRow);
    }

    return asObj;
}
