import { expect, Locator, test } from '@playwright/test';
import path from 'path';

type tableObj = string[][];

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
});

async function tableToArray(table: Locator): Promise<tableObj> {
    let asObj: tableObj = [];

    const rows = table.getByRole('row');
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const cells = row.getByRole('cell');
        const cellCount = await cells.count();
        const thisRow: string[] = [];

        for (let j = 0; j < cellCount; j++) {
            const cell = cells.nth(j);
            thisRow.push(await cell.innerHTML());
        }

        asObj.push(thisRow);
    }

    return asObj;
}
