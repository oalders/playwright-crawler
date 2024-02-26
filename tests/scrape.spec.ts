import { test, Page } from '@playwright/test';

type StackReport = {
    url: URL;
    visited: boolean;
    statusCode?: number;
};

type URLStack = {
    [key: string]: StackReport;
};

const baseURL = new URL('https://www.prettygoodping.com/');
const history: URLStack = {};

test('has title', async ({ page }) => {
    test.setTimeout(120000);
    const begin = new URL(baseURL);
    await extractLinks(begin, page);
});

const extractLinks = async (nextPage: URL, page: Page) => {
    console.log(nextPage.toString());
    const response = await page.goto(nextPage.toString(), { timeout: 10000 });
    history[nextPage.toString()] = { url: nextPage, visited: true, statusCode: response?.status() } as StackReport;
    if (response?.status() === 404) {
        console.error(`404 on ${nextPage.toString()}`);
    }

    const found = page.locator('[href]');
    const count = await found.count();

    for (let i = 0; i < count; i++) {
        const link = await found.nth(i).getAttribute('href');
        if (link === null) {
            continue;
        }
        try {
            const url = new URL(link, baseURL);

            url.hash = ''; // ignore fragments for now
            if (url.protocol === 'mailto:') {
                continue;
            }
            if (url.host !== nextPage.hostname || link === '#' || url.toString() in history) {
                continue;
            }
            else {
                console.log(`${link} ${i} of ${count} ${url.toString()}`);
                history[url.toString()] = { url: url, visited: false } as StackReport;
            }
        } catch (error) {
            console.log(`error: ${link} "${error}"`);
        }
    }
    for (const key in history) {
        if (history[key].visited === false) {
            console.log(`----- extract from ${history[key].url.toString()}`);
            await extractLinks(history[key].url, page);
        }
    };
    console.log('finished extractLinks');
};
