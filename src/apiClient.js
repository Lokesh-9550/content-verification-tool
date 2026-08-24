'use strict';

const logger = require('./logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Upper bound on how long we'll wait for a single Retry-After, in ms. */
const MAX_RETRY_AFTER_MS = 30000;

/**
 * Exponential backoff delay for a given attempt (0-indexed).
 * Exposed separately so it can be unit-tested without real timers.
 */
const backoffDelay = (attempt, baseMs) => baseMs * 2 ** attempt;

/**
 * Parse an HTTP `Retry-After` header into milliseconds.
 * Supports both the delta-seconds form (e.g. "120") and the HTTP-date form
 * (e.g. "Wed, 21 Oct 2026 07:28:00 GMT"). Returns null when absent/unparseable.
 */
function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
  return null;
}

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
        const err = new Error(`Retryable HTTP status ${res.status}`);
        // If the server told us how long to wait (common on 429/503), respect it.
        err.retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
        throw err;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) {
        const backoff = backoffDelay(attempt, backoffMs);
        const delay =
          err.retryAfterMs != null ? Math.min(err.retryAfterMs, MAX_RETRY_AFTER_MS) : backoff;
        logger.warn(`Request failed (${err.message}). Retry ${attempt + 1}/${retries} in ${delay}ms — ${url}`);
        await sleep(delay);
      }
    }
  }
  throw new Error(`Request to ${url} failed after ${retries} retries: ${lastErr && lastErr.message}`);
}

module.exports = { fetchWithRetry, backoffDelay, isRetryableStatus, parseRetryAfter, sleep };
