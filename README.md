# Getting Started

## Installation

```bash
npm install
npx playwright install
```

## Scrape

```text
npx playwright test tests/scrape.spec.ts
```

```bash
MAX_DEPTH=1 CRAWL_HOST=https://www.prettygoodping.com npx playwright test tests/scrape.spec.ts
```
