# Content Verification & Web Intelligence Tool

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Cheerio](https://img.shields.io/badge/Cheerio-1.x-E88C1F)](https://cheerio.js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A web intelligence tool that **crawls large sets of web pages**, extracts
structured data with **CSS selectors**, and **cross-checks it against a
third-party REST API** to verify accuracy, consistency, and completeness. Built
with **Node.js** and designed for reliable delivery at scale via **retry logic
and error handling**.

> Shipped configured against [**quotes.toscrape.com**](https://quotes.toscrape.com)
> (a public scraping sandbox) as the crawl source, and the free
> [**Wikipedia REST API**](https://en.wikipedia.org/api/rest_v1/) as the reference
> source for cross-verification. No API keys required — it runs out of the box.

---

## What It Does

The tool answers a practical data-quality question: *"We extracted this content
from the web — can we trust it?"* It does that in two complementary ways:

1. **Completeness / consistency checks** (offline) — every crawled record is
   checked for required fields (quote text, author, tags). Incomplete records are
   flagged rather than shipped.
2. **Cross-verification against a reference API** (online) — each unique author is
   looked up in the Wikipedia REST API. Results are classified as
   `verified`, `not_found`, `ambiguous`, or `unreachable`, so genuine data gaps
   are separated from transient failures.

## Features

- **Pagination-aware crawler** — follows the site's "next" link up to a
  configurable page limit.
- **CSS-selector extraction with Cheerio** — fast, jQuery-like parsing; all
  selectors are declared in `config/config.json`.
- **REST API integration** — cross-checks extracted entities against an external
  reference source.
- **Robust HTTP client** — timeouts via `AbortController`, retries with
  **exponential backoff**, and retry only on transient conditions (408/429/5xx).
- **Structured reporting** — emits both the crawled dataset and a
  `verification-report.json` summarizing verified vs. flagged records.

## Tech Stack

`JavaScript` · `Node.js` · `Cheerio (CSS Selectors)` · `REST API Integration` · `JSON`

## How It Works

```
config.json
    │
    ▼
crawler.js ──(fetchWithRetry)──▶ HTML ──▶ extractor.js (Cheerio + CSS selectors)
    │                                             │
    │  follow "next" link                         ▼
    └──────────────────────────────────▶  structured records
                                                  │
                        ┌─────────────────────────┴───────────────────────────┐
                        ▼                                                       ▼
        verifier.js: completeness checks            verifier.js: cross-check authors
        (missing text / author / tags)              against Wikipedia REST API
                        │                                                       │
                        └───────────────────────────┬───────────────────────────┘
                                                     ▼
                       data/output/quotes-*.json  +  verification-report-*.json
```

## Project Structure

```
content-verification-tool/
├── src/
│   ├── index.js        # Orchestrates crawl -> checks -> verify -> report
│   ├── crawler.js      # Pagination-aware crawler
│   ├── extractor.js    # Cheerio + CSS-selector extraction
│   ├── verifier.js     # Completeness checks + REST API cross-verification
│   ├── apiClient.js    # fetch with timeout, retries, exponential backoff
│   └── logger.js       # Leveled logging
├── config/config.json  # Crawl target, selectors, verification settings
├── data/               # Sample output (live runs write to data/output/)
├── tests/              # Node built-in test runner
├── package.json
└── README.md
```

## Getting Started

**Prerequisites:** Node.js >= 18 (uses the built-in global `fetch`).

```bash
git clone https://github.com/Lokesh-9550/content-verification-tool.git
cd content-verification-tool
npm install          # installs Cheerio
npm start            # crawls, verifies, and writes a report
```

See `data/sample-quotes.json` and `data/sample-verification-report.json` for
examples of the two output files.

## Configuration

`config/config.json` controls the crawl source, selectors, and verification:

```jsonc
{
  "crawl":  { "startUrl": "https://quotes.toscrape.com/page/1/", "maxPages": 10, "delayMs": 800 },
  "selectors": { "quote": "div.quote", "author": "small.author", "next": "li.next a", ... },
  "verification": { "apiBase": "https://en.wikipedia.org/api/rest_v1/page/summary/",
                    "retries": 3, "backoffMs": 500, "timeoutMs": 10000, "requireTags": true }
}
```

## Testing

```bash
npm test     # Node built-in test runner (tests/*.test.js)
```

Tests cover CSS-selector extraction (Cheerio), completeness checks, report
aggregation, and the retry/backoff logic.

## Responsible Scraping

The crawl source, `quotes.toscrape.com`, is published for scraping practice. When
retargeting, respect `robots.txt` and Terms of Service, keep `delayMs` polite,
and stay within the reference API's rate limits.

## Author

**Puttam Lokesh** — Associate Software Engineer (JavaScript, Web Scraping & Data Extraction)
[GitHub](https://github.com/Lokesh-9550) · [LinkedIn](https://www.linkedin.com/in/puttam-lokesh-73ab87268)

## License

Released under the [MIT License](LICENSE).
