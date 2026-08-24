'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { crawl } = require('./crawler');
const { checkCompleteness, verifyAuthors, buildReport } = require('./verifier');

function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'config.json'), 'utf8'));
}

function writeJson(filePath, data, pretty) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, pretty ? 2 : 0));
}

/**
 * End-to-end verification run:
 *   1. Crawl the source site (follow pagination)
 *   2. Run completeness/consistency checks on extracted records
 *   3. Cross-check each unique author against the reference REST API
 *   4. Write the crawled data + a verification report
 */
async function main() {
  const config = loadConfig();
  logger.info('Starting content verification run...');

  const quotes = await crawl(config);
  logger.info(`Crawled ${quotes.length} quote(s) total.`);

  const completenessIssues = checkCompleteness(quotes, config.verification.requireTags);
  if (completenessIssues.length) {
    logger.warn(`${completenessIssues.length} record(s) failed completeness checks.`);
  }

  const verificationResults = await verifyAuthors(quotes, config.verification);
  const report = buildReport(quotes, completenessIssues, verificationResults);

  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  writeJson(
    path.join(config.output.dir, `quotes-${runId}.json`),
    { generatedAt: report.generatedAt, count: quotes.length, quotes },
    config.output.pretty
  );
  writeJson(path.join(config.output.dir, `verification-report-${runId}.json`), report, config.output.pretty);

  logger.info(
    `Done. Verified ${report.summary.authorsVerified}/${report.summary.uniqueAuthors} authors; ` +
      `${report.summary.completenessIssues} completeness issue(s).`
  );
  logger.info(`Output written to ${config.output.dir}/`);
}

if (require.main === module) {
  main().catch((err) => {
    logger.error(`Fatal error: ${err.stack || err.message}`);
    process.exit(1);
  });
}

module.exports = { main };
