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
    const matches = await toString(await rowMatches(found, 'River'));
    expect(matches).toStrictEqual([['River', 'Cartwright']]);
});

test('find River via regex', async ({ page }) => {
    const found = page.getByRole('table');
    const matches = await toString(await rowMatches(found, /River/));
    expect(matches).toStrictEqual([['River', 'Cartwright']]);
});

test('find multiple rows via regex', async ({ page }) => {
    const found = page.getByRole('table');
    const matches = await toString(await rowMatches(found, /am/));
    expect(matches).toStrictEqual([
        ['First Name', 'Last Name'],
        ['Jackson', 'Lamb'],
    ]);
});

const toString = async function(locArray: locObj) {
    let asObj: tableObj = [];
    for (let i = 0; i < locArray.length; i++) {
        const thisRow = locArray[i];
        const newRow: string[] = [];
        for (let j = 0; j < thisRow.length; j++) {
            newRow.push(await thisRow[j].innerHTML());
        }
        asObj.push(newRow);
    }
    return asObj;
};

const rowMatches = async function(
    table: Locator,
    value: string | RegExp,
): Promise<locObj> {
    const locTable = await tableToLocArray(table);
    const matchingRows = [];
    for (const row of locTable) {
        const isMatch = await Promise.all(
            row.map(async (cell) => {
                const innerHTML = await cell.innerHTML();
                if (typeof value === 'string') {
                    return innerHTML === value;
                } else {
                    return value.test(innerHTML);
                }
            })
        );
        if (isMatch.some(Boolean)) {
            matchingRows.push(row);
        }
    }
    return matchingRows;
};

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
