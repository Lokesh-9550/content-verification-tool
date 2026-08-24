'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { backoffDelay, isRetryableStatus, parseRetryAfter } = require('../src/apiClient');

test('backoffDelay grows exponentially', () => {
  assert.strictEqual(backoffDelay(0, 500), 500);
  assert.strictEqual(backoffDelay(1, 500), 1000);
  assert.strictEqual(backoffDelay(2, 500), 2000);
});

test('isRetryableStatus flags transient failures but not 404/200', () => {
  assert.strictEqual(isRetryableStatus(408), true);
  assert.strictEqual(isRetryableStatus(429), true);
  assert.strictEqual(isRetryableStatus(503), true);
  assert.strictEqual(isRetryableStatus(404), false);
  assert.strictEqual(isRetryableStatus(200), false);
});

test('parseRetryAfter handles delta-seconds, HTTP-date, and missing values', () => {
  // delta-seconds form
  assert.strictEqual(parseRetryAfter('120'), 120000);
  assert.strictEqual(parseRetryAfter('0'), 0);
  // absent / unparseable
  assert.strictEqual(parseRetryAfter(null), null);
  assert.strictEqual(parseRetryAfter(''), null);
  assert.strictEqual(parseRetryAfter('not-a-date'), null);
  // HTTP-date form ~10s in the future should be a small positive number of ms
  const future = new Date(Date.now() + 10000).toUTCString();
  const ms = parseRetryAfter(future);
  assert.ok(ms > 0 && ms <= 10000, `expected 0<ms<=10000, got ${ms}`);
});
