import { test, Page } from '@playwright/test'
import * as cheerio from 'cheerio'
import * as natural from 'natural';
import { english as stopWords } from 'stopwords';

type StackReport = {
    url: string | URL
    visited: boolean
    statusCode?: number
    description?: string
    title?: string
    heading?: string
}
type URLStack = {
    [key: string]: StackReport
}

const baseURL = new URL('https://www.prettygoodping.com/')
const history: URLStack = {}

test('has title', async ({ page }) => {
    test.setTimeout(120000)
    const begin = new URL(baseURL)
    await extractLinks(begin, page)
    console.dir(history, { depth: null })
})

const extractLinks = async (nextPage: URL, page: Page) => {
    console.log(nextPage.toString())
    const response = await page.goto(nextPage.toString(), { timeout: 10000 })
    const htmlContent = await page.content()
    const $ = cheerio.load(htmlContent)
    history[nextPage.toString()] = {
        url: nextPage.toString(),
        visited: true,
        statusCode: response?.status(),
        description: $('meta[name="description"]').attr('content'),
        title: $('title').text(),
        heading: $('h1').first().text(),
    } as StackReport
    if (response?.status() === 404) {
        console.error(`404 on ${nextPage.toString()}`)
    }

    const words = calculateWordFrequency(await page.textContent('body'));
    console.dir(words)

    const found = page.getByRole('link')
    const count = await found.count()

    for (let i = 0; i < count; i++) {
        const link = await found.nth(i).getAttribute('href')
        if (link === null) {
            continue
        }
        try {
            const url = new URL(link, baseURL)

            url.hash = '' // ignore fragments for now
            if (url.protocol === 'mailto:') {
                continue
            }
            if (
                url.host !== nextPage.hostname ||
                link === '#' ||
                url.toString() in history
            ) {
                continue
            } else {
                console.log(`${link} ${i} of ${count} ${url.toString()}`)
                history[url.toString()] = {
                    url: url,
                    visited: false,
                } as StackReport
            }
        } catch (error) {
            console.log(`error: ${link} "${error}"`)
        }
    }
    for (const key in history) {
        if (history[key].visited === false) {
            console.log(`----- extract from ${history[key].url.toString()}`)
            const url = new URL(history[key].url);
            await extractLinks(url, page);
        }
    }
    console.log('finished extractLinks')
}

const calculateWordFrequency = (text: string) => {
    // Tokenize the text into individual words
    const tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(text);

    if (tokens === null) {
        return [];
    }

    // Remove common words (stopwords) from the list of tokens
    const filteredTokens = tokens.filter(token => !stopWords.includes(token.toLowerCase()));

    // Count the frequency of each word
    const wordFrequency: Record<string, number> = {};
    filteredTokens.forEach(token => {
        wordFrequency[token] = (wordFrequency[token] || 0) + 1;
    });

    // Convert word frequency object into a sorted array
    const sortedWordFrequency = Object.entries(wordFrequency).sort((a, b) => b[1] - a[1]);

    // Return the word frequency
    return sortedWordFrequency;
}
