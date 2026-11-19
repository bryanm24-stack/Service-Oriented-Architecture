require('dotenv').config();
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--test', 'tests/cashflow.test.js'], {
  stdio: 'inherit',
  env: { ...process.env, RUN_MYSQL_TESTS: '1' },
});
process.exitCode = result.status === null ? 1 : result.status;
