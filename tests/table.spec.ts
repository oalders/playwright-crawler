import { expect, Locator, test } from '@playwright/test';
import path from 'path';
import * as tabular from '../lib/tabular';

type tableObj = string[][];
type locObj = Locator[][];

test.beforeEach(async ({ page }) => {
  const filePath = path.join(process.cwd(), 'test-data/table.html');
  await page.goto(`file://${filePath}`);
});

test('tableToArray', async ({ page }) => {
  const found = page.getByRole('table');
  const table = await tabular.tableToArray(found);
  expect(table).toEqual([
    ['First Name', 'Last Name'],
    ['Jackson', 'Lamb'],
    ['River', 'Cartwright'],
  ]);
});

test('tableToLocArray', async ({ page }) => {
  const found = page.getByRole('table');
  const locTable = await tabular.tableToLocArray(found);
  expect(await locTable[0][0].innerHTML()).toEqual('First Name');
});

test('find River via string match', async ({ page }) => {
  const found = page.getByRole('table');
  const matches = await tabular.stringify(
    await tabular.rowMatches(found, 'River'),
  );
  expect(matches).toStrictEqual([['River', 'Cartwright']]);
});

test('find River via regex', async ({ page }) => {
  const found = page.getByRole('table');
  const matches = await tabular.stringify(
    await tabular.rowMatches(found, /River/),
  );
  expect(matches).toStrictEqual([['River', 'Cartwright']]);
});

test('find multiple rows via regex', async ({ page }) => {
  const found = page.getByRole('table');
  const matches = await tabular.stringify(
    await tabular.rowMatches(found, /am/),
  );
  expect(matches).toStrictEqual([
    ['First Name', 'Last Name'],
    ['Jackson', 'Lamb'],
  ]);
});

test('find no rows via regex', async ({ page }) => {
  const found = page.getByRole('table');
  const matches = await tabular.stringify(
    await tabular.rowMatches(found, /ZZZ/),
  );
  expect(matches).toStrictEqual([]);
});
