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
});

async function tableToArray(table: Locator): Promise<tableObj> {
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

async function tableToLocArray(table: Locator): Promise<locObj> {
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
