'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { backoffDelay, isRetryableStatus } = require('../src/apiClient');

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
