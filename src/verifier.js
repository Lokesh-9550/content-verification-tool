'use strict';

const logger = require('./logger');
const { fetchWithRetry, sleep } = require('./apiClient');

/**
 * Completeness / consistency checks on extracted records.
 * Flags records missing text, author, or (optionally) tags — this is the
 * "completeness" half of verification and needs no network.
 */
function checkCompleteness(quotes, requireTags) {
  const issues = [];
  quotes.forEach((q, i) => {
    const missing = [];
    if (!q.text) missing.push('text');
    if (!q.author) missing.push('author');
    if (requireTags && (!q.tags || q.tags.length === 0)) missing.push('tags');
    if (missing.length) issues.push({ index: i, author: q.author || '(unknown)', missing });
  });
  return issues;
}

/**
 * Cross-check a single author against the Wikipedia REST summary API.
 * Distinguishes verified / not_found / ambiguous / unreachable so the
 * report can separate genuine data gaps from transient API failures.
 *
 * @returns {Promise<{author: string, status: string, wikipediaTitle?: string, extract?: string}>}
 */
async function verifyAuthor(author, verificationCfg) {
  const slug = encodeURIComponent(author.trim().replace(/\s+/g, '_'));
  const url = verificationCfg.apiBase + slug;
  try {
    const res = await fetchWithRetry(url, {
      retries: verificationCfg.retries,
      backoffMs: verificationCfg.backoffMs,
      timeoutMs: verificationCfg.timeoutMs,
      headers: {
        Accept: 'application/json',
        // Wikimedia's API etiquette asks callers to identify themselves with a
        // descriptive User-Agent (client + contact). Omitting it invites
        // aggressive rate-limiting (429s).
        'User-Agent': verificationCfg.userAgent,
      },
    });

    if (res.status === 404) return { author, status: 'not_found' };
    if (!res.ok) return { author, status: `error_http_${res.status}` };

    const data = await res.json();
    if (typeof data.type === 'string' && data.type.includes('disambiguation')) {
      return { author, status: 'ambiguous', wikipediaTitle: data.title };
    }
    return {
      author,
      status: 'verified',
      wikipediaTitle: data.title,
      extract: data.extract ? String(data.extract).slice(0, 200) : undefined,
    };
  } catch (err) {
    return { author, status: 'unreachable', error: err.message };
  }
}

/**
 * Verify every unique author found in the crawled quotes.
 */
async function verifyAuthors(quotes, verificationCfg) {
  const uniqueAuthors = [...new Set(quotes.map((q) => q.author).filter(Boolean))];
  logger.info(`Verifying ${uniqueAuthors.length} unique author(s) against the reference API...`);

  const delayMs = verificationCfg.delayMs || 0;
  const results = [];
  for (let i = 0; i < uniqueAuthors.length; i += 1) {
    const author = uniqueAuthors[i];
    const result = await verifyAuthor(author, verificationCfg);
    logger.info(`  ${result.status === 'verified' ? '[OK]  ' : '[FLAG]'} ${author} -> ${result.status}`);
    results.push(result);
    // Space out requests so we stay under the reference API's rate limit.
    if (delayMs && i < uniqueAuthors.length - 1) await sleep(delayMs);
  }
  return results;
}

/**
 * Combine data-quality and cross-verification results into one report.
 */
function buildReport(quotes, completenessIssues, verificationResults) {
  const verified = verificationResults.filter((r) => r.status === 'verified').length;
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      quotesExtracted: quotes.length,
      uniqueAuthors: verificationResults.length,
      authorsVerified: verified,
      authorsFlagged: verificationResults.length - verified,
      completenessIssues: completenessIssues.length,
    },
    completenessIssues,
    authorVerification: verificationResults,
  };
}

module.exports = { checkCompleteness, verifyAuthor, verifyAuthors, buildReport };
