'use strict';

const cheerio = require('cheerio');

/**
 * Extract quote records from a page's HTML using configured CSS selectors.
 *
 * @param {string} html    raw page HTML
 * @param {object} selectors  config.selectors
 * @param {string} baseUrl  used to resolve relative links to absolute URLs
 * @returns {{ quotes: object[], nextPage: string|null }}
 */
function extractQuotes(html, selectors, baseUrl) {
  const $ = cheerio.load(html);
  const quotes = [];

  $(selectors.quote).each((_, el) => {
    const $el = $(el);
    const text = $el.find(selectors.text).text().trim();
    const author = $el.find(selectors.author).text().trim();
    const authorHref = $el.find(selectors.authorLink).attr('href');
    const tags = $el
      .find(selectors.tag)
      .map((__, t) => $(t).text().trim())
      .get();

    quotes.push({
      text,
      author,
      authorUrl: authorHref ? new URL(authorHref, baseUrl).href : null,
      tags,
    });
  });

  const nextHref = $(selectors.next).attr('href');
  const nextPage = nextHref ? new URL(nextHref, baseUrl).href : null;

  return { quotes, nextPage };
}

module.exports = { extractQuotes };
