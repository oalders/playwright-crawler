import { expect, Locator, test } from '@playwright/test';
import path from 'path';

type tableObj = string[][];
type locObj = Locator[][];

test.beforeEach(async ({ page }) => {
    const filePath = path.join(process.cwd(), 'test-data/table.html');
    await page.goto(`file://${filePath}`);
});

test('tableToArray', async ({ page }) => {
    const found = page.getByRole('table');
    const table = await tableToArray(found);
    expect(table).toEqual([
        ['First Name', 'Last Name'],
        ['Jackson', 'Lamb'],
        ['River', 'Cartwright'],
    ]);
});

test('tableToLocArray', async ({ page }) => {
    const found = page.getByRole('table');
    const locTable = await tableToLocArray(found);
    expect(await locTable[0][0].innerHTML()).toEqual('First Name');
});

test('find River via string match', async ({ page }) => {
    const found = page.getByRole('table');
    const match = await rowMatch(found, 'River');
    expect(await match[0].innerHTML()).toEqual('River');
    expect(await match[1].innerHTML()).toEqual('Cartwright');
});

test('find River via regex', async ({ page }) => {
    const found = page.getByRole('table');
    const match = await rowMatch(found, /River/);
    expect(await match[0].innerHTML()).toEqual('River');
    expect(await match[1].innerHTML()).toEqual('Cartwright');
});

test('find multiple rows via regex', async ({ page }) => {
    const found = page.getByRole('table');
    const match = await rowMatch(found, /am/);
    expect(await match[0].innerHTML()).toEqual('First Name');
    expect(await match[1].innerHTML()).toEqual('Last Name');
});

async function rowMatch(
    table: Locator,
    value: string | RegExp,
): Promise<Locator[]> {
    const locTable = await tableToLocArray(table);
    const allRows = await Promise.all(
        locTable.map(async (row) => {
            const innerHTML = await row[0].innerHTML();
            if (typeof value === 'string') {
                return innerHTML === value ? row : null;
            } else {
                return value.test(innerHTML) ? row : null;
            }
        }),
    );
    const rowWithMatchingValue = allRows.find((row) => row !== null);
    return rowWithMatchingValue;
}

const tableToArray = async function(table: Locator): Promise<tableObj> {
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
};

const tableToLocArray = async function(table: Locator): Promise<locObj> {
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
};
