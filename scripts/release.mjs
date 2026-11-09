import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { name, version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!process.env.npm_execpath) throw new Error('Run this script through npm run release:build');
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
execFileSync(process.execPath, [process.env.npm_execpath, 'pack', '--ignore-scripts', '--pack-destination', 'dist'],
  { cwd: root, stdio: 'inherit', timeout: 60_000, windowsHide: true });
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
execFileSync(python, ['scripts/build_release.py', `dist/${name}-${version}.tgz`],
  { cwd: root, stdio: 'inherit', timeout: 30_000, windowsHide: true });
execFileSync(python, ['scripts/verify_release.py'],
  { cwd: root, stdio: 'inherit', timeout: 30_000, windowsHide: true });
