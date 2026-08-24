'use strict';

const logger = require('./logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff delay for a given attempt (0-indexed).
 * Exposed separately so it can be unit-tested without real timers.
 */
const backoffDelay = (attempt, baseMs) => baseMs * 2 ** attempt;

/** Retryable transport/server conditions. */
const isRetryableStatus = (status) => status === 408 || status === 429 || status >= 500;

/**
 * Fetch a URL with timeout, retries, and exponential backoff.
 *
 * Retries on network errors, timeouts, and retryable HTTP status codes
 * (408/429/5xx). 4xx responses (other than 408/429) are returned as-is so
 * callers can distinguish "not found" from "temporarily unavailable".
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.retries=3]
 * @param {number} [opts.backoffMs=500]
 * @param {number} [opts.timeoutMs=10000]
 * @param {Record<string,string>} [opts.headers]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, opts = {}) {
  const { retries = 3, backoffMs = 500, timeoutMs = 10000, headers = {} } = opts;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(timer);

      if (isRetryableStatus(res.status)) {
        throw new Error(`Retryable HTTP status ${res.status}`);
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        const delay = backoffDelay(attempt, backoffMs);
        logger.warn(`Request failed (${err.message}). Retry ${attempt + 1}/${retries} in ${delay}ms — ${url}`);
        await sleep(delay);
      }
    }
  }
  throw new Error(`Request to ${url} failed after ${retries} retries: ${lastErr && lastErr.message}`);
}

module.exports = { fetchWithRetry, backoffDelay, isRetryableStatus, sleep };
