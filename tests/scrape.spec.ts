import { test, Page } from '@playwright/test';
import * as cheerio from 'cheerio';
import * as natural from 'natural';
import { english as stopWords } from 'stopwords';

type StackReport = {
  url: string | URL;
  visited: boolean;
  statusCode?: number;
  description?: string;
  title?: string;
  heading?: string;
};
type URLStack = {
  [key: string]: StackReport;
};

const baseURL = new URL(
  process.env.CRAWL_HOST || 'https://www.prettygoodping.com/',
);
const maxDepth = process.env.MAX_DEPTH ? parseInt(process.env.MAX_DEPTH) : 10;

const history: URLStack = {};

import { writeFileSync } from 'node:fs';
import Papa from 'papaparse';

test('has title', async ({ page }) => {
  test.setTimeout(120000);
  const begin = new URL(baseURL);
  await crawl(begin, page);
  console.dir(history, { depth: null });

  // Get the url, description, title, and heading fields from the values of the history object
  const data = Object.values(history).map(
    ({ url, description, title, heading }) => ({
      url,
      description,
      title,
      heading,
    }),
  );

  // Convert to CSV using Papa.unparse
  const csv = Papa.unparse(data);

  // Write the CSV to a file
  writeFileSync('report.csv', csv);
});

const crawl = async (nextPage: URL, page: Page) => {
  if (
    maxDepth > 0 &&
    Object.values(history).filter((page) => page.visited).length >= maxDepth
  ) {
    return;
  }
  console.log(nextPage.toString());
  const response = await page.goto(nextPage.toString(), { timeout: 10000 });
  const htmlContent = await page.content();
  const $ = cheerio.load(htmlContent);
  history[nextPage.toString()] = {
    url: new URL(nextPage.toString()).pathname,
    visited: true,
    statusCode: response?.status(),
    description: $('meta[name="description"]').attr('content'),
    title: $('title').text(),
    heading: $('h1').first().text(),
  } as StackReport;
  if (response?.status() === 404) {
    console.error(`404 on ${nextPage.toString()}`);
  }

  const bodyContent = await page.textContent('body');
  const words = bodyContent ? calculateWordFrequency(bodyContent) : [];
  await logLinkAttributes(page);
  console.dir(words);

  const found = page.getByRole('link');
  const count = await found.count();

  for (let i = 0; i < count; i++) {
    const link = await found.nth(i).getAttribute('href');
    if (link === null) {
      console.error('null link?');
      continue;
    }
    try {
      const url = new URL(link, baseURL);

      url.hash = ''; // ignore fragments for now
      if (url.protocol === 'mailto:') {
        continue;
      }
      if (
        url.hostname !== nextPage.hostname ||
        link === '#' ||
        url.toString() in history
      ) {
        continue;
      } else {
        console.log(`${link} ${i} of ${count} ${url.toString()}`);
        history[url.toString()] = {
          url: url,
          visited: false,
        } as StackReport;
      }
    } catch (error) {
      console.log(`error: ${link} "${error}"`);
    }
  }
  for (const key in history) {
    if (history[key].visited === false) {
      console.log(`----- extract from ${history[key].url.toString()}`);
      const url = new URL(history[key].url);
      await crawl(url, page);
    }
  }
  console.log('finished extractLinks');
};

const calculateWordFrequency = (text: string) => {
  // Tokenize the text into individual words
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text);

  if (tokens === null) {
    return [];
  }

  // Remove common words (stopwords) from the list of tokens
  const filteredTokens = tokens.filter(
    (token) => !stopWords.includes(token.toLowerCase()),
  );

  // Count the frequency of each word
  const wordFrequency: Record<string, number> = {};
  filteredTokens.forEach((token) => {
    wordFrequency[token] = (wordFrequency[token] || 0) + 1;
  });

  // Convert word frequency object into a sorted array
  const sortedWordFrequency = Object.entries(wordFrequency).sort(
    (a, b) => b[1] - a[1],
  );

  // Return the word frequency
  return sortedWordFrequency;
};

async function logLinkAttributes(page: Page) {
  const links = page.getByRole('link');
  const count = await links.count();

  for (let i = 0; i < count; i++) {
    const link = await links.nth(i);
    if (link === null) {
      console.error('null link in attribute logger');
      continue;
    }
    const href = await link.getAttribute('href');
    const title = await link.getAttribute('title');
    const alt = await link.getAttribute('alt');

    console.log(`Link ${i + 1}: href=${href}, title=${title}, alt=${alt}`);
  }
}
