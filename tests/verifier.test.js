'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { checkCompleteness, buildReport } = require('../src/verifier');

test('checkCompleteness flags records missing required fields', () => {
  const quotes = [
    { text: 'x', author: 'A', tags: ['t'] }, // ok
    { text: '', author: 'B', tags: [] }, // missing text + tags
    { text: 'y', author: '', tags: ['t'] }, // missing author
  ];
  const issues = checkCompleteness(quotes, true);
  assert.strictEqual(issues.length, 2);
});

test('checkCompleteness respects requireTags flag', () => {
  const quotes = [{ text: 'x', author: 'A', tags: [] }];
  assert.strictEqual(checkCompleteness(quotes, false).length, 0);
  assert.strictEqual(checkCompleteness(quotes, true).length, 1);
});

test('buildReport summarizes verified vs. flagged authors', () => {
  const quotes = [{ text: 'x', author: 'A', tags: ['t'] }];
  const results = [
    { author: 'A', status: 'verified' },
    { author: 'B', status: 'not_found' },
  ];
  const report = buildReport(quotes, [], results);
  assert.strictEqual(report.summary.uniqueAuthors, 2);
  assert.strictEqual(report.summary.authorsVerified, 1);
  assert.strictEqual(report.summary.authorsFlagged, 1);
});
