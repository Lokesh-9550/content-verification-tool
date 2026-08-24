'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { extractQuotes } = require('../src/extractor');

const selectors = {
  quote: 'div.quote',
  text: 'span.text',
  author: 'small.author',
  authorLink: 'a[href^="/author/"]',
  tag: 'div.tags a.tag',
  next: 'li.next a',
};

const html = `
<div class="quote">
  <span class="text">"The world as we have created it is a process of our thinking."</span>
  <small class="author">Albert Einstein</small>
  <a href="/author/Albert-Einstein">(about)</a>
  <div class="tags">
    <a class="tag" href="/tag/change/">change</a>
    <a class="tag" href="/tag/thinking/">thinking</a>
  </div>
</div>
<nav><ul class="pager"><li class="next"><a href="/page/2/">Next</a></li></ul></nav>
`;

test('extracts quote fields via configured CSS selectors', () => {
  const { quotes, nextPage } = extractQuotes(html, selectors, 'https://quotes.toscrape.com');
  assert.strictEqual(quotes.length, 1);
  assert.strictEqual(quotes[0].author, 'Albert Einstein');
  assert.deepStrictEqual(quotes[0].tags, ['change', 'thinking']);
  assert.strictEqual(quotes[0].authorUrl, 'https://quotes.toscrape.com/author/Albert-Einstein');
  assert.strictEqual(nextPage, 'https://quotes.toscrape.com/page/2/');
});

test('returns null nextPage when there is no next link', () => {
  const { nextPage } = extractQuotes('<div class="quote"></div>', selectors, 'https://quotes.toscrape.com');
  assert.strictEqual(nextPage, null);
});
