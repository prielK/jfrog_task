'use strict';

const fs = require('node:fs');
const path = require('node:path');
const [filename, ...options] = process.argv.slice(2);
if (!filename) throw new Error('Usage: node submission/scripts/summarize-scan.cjs report.sarif [--assert-contextual] [--assert-absent=CVE-ID]');
const report = JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, ''));
const runs = (report.runs || []).filter(run => run.tool?.driver?.name === 'JFrog Xray Scanner');
if (!runs.length) throw new Error('No JFrog Xray scan run found; refusing to treat an empty report as a clean scan.');

const precedence = ['Applicable', 'Undetermined', 'Missing Context', 'Not Applicable', 'Not Covered', 'Not Scanned'];
const findings = new Map();
for (const run of runs) {
  const rules = new Map((run.tool.driver.rules || []).map(rule => [rule.id, rule]));
  for (const result of run.results || []) {
    const rule = rules.get(result.ruleId) || {};
    const id = result.ruleId || rule.id;
    const status = result.properties?.applicability || 'Not Scanned';
    const previous = findings.get(id);
    if (previous && precedence.indexOf(previous.status) <= precedence.indexOf(status)) continue;
    const cve = id?.match(/^CVE-\d{4}-\d+/)?.[0] || id;
    const score = Number(rule.properties?.['security-severity']);
    findings.set(id, {
      cve,
      component: id?.slice(cve.length + 1),
      status,
      cvss: Number.isFinite(score) ? score : null,
      severity: !Number.isFinite(score) ? 'Unknown' : score >= 9 ? 'Critical' : score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low',
      fixedVersion: result.properties?.fixedVersion || null
    });
  }
}

const values = [...findings.values()];
const counts = {};
for (const finding of values) counts[finding.status] = (counts[finding.status] || 0) + 1;
const applicable = values.filter(finding => finding.status === 'Applicable').sort((a, b) => b.cvss - a.cvss);
const summary = {
  report: path.basename(filename),
  distinctComponentFindings: values.length,
  counts,
  applicable,
  selectedCvePresent: values.some(finding => finding.cve === 'CVE-2022-31129')
};
console.log(JSON.stringify(summary, null, 2));

if (options.includes('--assert-contextual') && !values.some(finding => ['Applicable', 'Not Applicable', 'Missing Context', 'Undetermined'].includes(finding.status))) {
  throw new Error('No contextual determinations found; check that Advanced Security actually ran.');
}
for (const option of options) {
  if (option.startsWith('--assert-absent=')) {
    const cve = option.slice('--assert-absent='.length);
    if (values.some(finding => finding.cve === cve)) throw new Error(cve + ' is still reported; remediation has not been verified.');
  }
}
