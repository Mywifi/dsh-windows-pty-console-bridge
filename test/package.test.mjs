import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('npm pack contains only the complete portable host bundle', () => {
  assert.ok(process.env.npm_execpath, 'Run tests through npm test');
  const [pack] = JSON.parse(execFileSync(process.execPath,
    [process.env.npm_execpath, 'pack', '--dry-run', '--ignore-scripts', '--json'],
    { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true }));
  assert.equal(pack.version, manifest.version);
  assert.equal(pack.name, manifest.name);
  assert.deepEqual(pack.files.map(f => f.path).sort(), [
    'package.json', 'index.mjs', 'bridge.cmd', 'cordis.patch.yml', 'icon.svg',
    'locale/en.json', 'locale/zh.json', 'README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'LICENSE',
  ].sort());
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.exports['./icon'], './icon.svg');
  assert.equal(manifest.dependencies, undefined);
  assert.equal(manifest.scripts.postinstall, undefined);
  for (const locale of ['en', 'zh']) {
    const data = JSON.parse(readFileSync(new URL(`../locale/${locale}.json`, import.meta.url), 'utf8'));
    assert.ok(data.meta.title && data.meta.description);
  }
});
