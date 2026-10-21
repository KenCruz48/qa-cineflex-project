'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const newman = require('newman');
const { createApp } = require('../backend/app');
const root = path.resolve(__dirname, '..');
process.chdir(root);
function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(Error(`Prueba fallida: ${args.join(' ')} (${code})`)));
  });
}
async function run() {
  await runNode(['--test', 'tests/api.test.js']);
  fs.mkdirSync('reports', { recursive: true });
  const fixture = createApp({ logging: false });
  const server = fixture.app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const environment = JSON.parse(fs.readFileSync('api_tests/CineFlex_Environment.json', 'utf8'));
    environment.values.find(v => v.key === 'base_url').value = `http://127.0.0.1:${server.address().port}/api/v1`;
    await new Promise((resolve, reject) => newman.run({
      collection: require('../api_tests/CineFlex_API_Collection.json'),
      environment,
      reporters: ['cli', 'json'],
      reporter: { json: { export: 'reports/newman.json' } }
    }, (error, summary) => error ? reject(error) : summary.run.failures.length ? reject(Error('Newman reportó fallos')) : resolve()));
  } finally {
    await new Promise(resolve => server.close(resolve));
    fixture.close();
  }
  await runNode(['ui_tests/test_suite.js']);
  console.log('\nCineFlex: todas las pruebas automatizadas aprobadas.');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
