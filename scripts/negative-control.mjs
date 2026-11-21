import { spawnSync } from 'node:child_process';

// This command succeeds only when the deliberately wrong balance is detected.
const result = spawnSync(process.execPath, [
  'node_modules/@playwright/test/cli.js', 'test', '--project=chromium',
  '--grep', 'balance is formatted from integer cents', '--reporter=list',
  '--output=test-results/negative-control'
], { env: { ...process.env, QA_MUTATE_BALANCE: '1' }, encoding: 'utf8' });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
const assertionDetected = result.status === 1 &&
  result.stdout?.includes('1 failed') && result.stdout?.includes('1,250.76');
if (!assertionDetected) {
  console.error('Negative control did not demonstrate the expected balance assertion failure.');
  process.exit(1);
}
console.log('PASS: the suite detected the deliberately corrupted balance.');
