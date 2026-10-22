'use strict';

// Bound the CVE-2022-31129 reproducer in a child process so an unfixed
// dependency cannot block the test runner indefinitely. No network is used.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (process.argv.includes('--worker')) {
  const moment = require('moment');
  moment.suppressDeprecationWarnings = true;
  const started = Date.now();
  const maliciousInputIsValid = moment('('.repeat(500000)).isValid();
  const normalDate = moment.utc('Wed, 01 Jan 2020 00:00:00 GMT').toISOString();
  process.stdout.write(JSON.stringify({ maliciousInputIsValid, normalDate, elapsedMs: Date.now() - started }));
} else {
  const result = spawnSync(process.execPath, [__filename, '--worker'], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
    maxBuffer: 1024 * 1024
  });
  if (result.error) {
    console.error(`FAIL: Moment parsing did not complete within the 5-second budget: ${result.error.message}`);
    process.exit(1);
  }
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.maliciousInputIsValid, false);
  assert.equal(parsed.normalDate, '2020-01-01T00:00:00.000Z');
  console.log(`PASS: CVE-2022-31129 input rejected in ${parsed.elapsedMs} ms; normal RFC2822 parsing preserved.`);
}
