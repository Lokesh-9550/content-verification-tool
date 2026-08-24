'use strict';

const logger = require('./logger');
const { fetchWithRetry, sleep } = require('./apiClient');
const { extractQuotes } = require('./extractor');

/**
 * Crawl the paginated source site by following its "next" link,
 * up to config.crawl.maxPages, and return all extracted records.
 *
 * @param {object} config parsed config.json
 * @returns {Promise<object[]>}
 */
async function crawl(config) {
  const { startUrl, baseUrl, maxPages, delayMs, userAgent } = config.crawl;
  const headers = { 'User-Agent': userAgent };

  let url = startUrl;
  let page = 0;
  const all = [];

  while (url && page < maxPages) {
    page += 1;
    logger.info(`Crawling page ${page}: ${url}`);

    const res = await fetchWithRetry(url, { headers, timeoutMs: config.verification.timeoutMs });
    if (!res.ok) {
      logger.warn(`Stopping crawl — ${url} returned HTTP ${res.status}`);
      break;
    }

    const html = await res.text();
    const { quotes, nextPage } = extractQuotes(html, config.selectors, baseUrl);
    logger.info(`  -> extracted ${quotes.length} quote(s)`);
    all.push(...quotes);

    url = nextPage;
    if (url && page < maxPages) await sleep(delayMs);
  }

  return all;
}

module.exports = { crawl };
