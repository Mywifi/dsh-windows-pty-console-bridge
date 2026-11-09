import assert from 'node:assert/strict';
import { test } from 'node:test';
import { win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bridgeSpec, installBridge } from '../index.mjs';

const executable = 'C:\\Users\\Test User\\Apps\\DeepSeek Harness\\DeepSeek Harness.exe';
const runner = win32.join(win32.dirname(executable), 'resources', 'app.asar', 'dsh',
  'node_modules', '@deepseek-ai', 'dsh-sandbox-windows-acl', 'lib', 'runner.js');
const options = { platform: 'win32', electron: true, executable };
const fixture = () => ({ argv: [executable, runner, '--workspace', 'D:\\Some Project',
  '--temp', 'C:\\Temp\\Private', '--mode', 'workspace-write', '--', 'pwsh', '-NoProfile'],
  cwd: 'D:\\Some Project', env: { TERM: 'dumb' }, signal: new AbortController().signal,
  rows: 30, cols: 120, graceMs: 3000 });

test('retains the complete confined invocation, policy, cwd and cancellation', () => {
  const input = fixture(), output = bridgeSpec(input, options);
  assert.deepEqual(output.argv.slice(5), input.argv.slice(1));
  assert.equal(output.cwd, input.cwd);
  assert.equal(output.signal, input.signal);
  assert.equal(output.graceMs, input.graceMs);
  assert.equal(output.env.TERM, input.env.TERM);
  assert.equal(output.env.DSH_PTY_CONSOLE_EXECUTABLE, executable);
  assert.equal(output.env.ELECTRON_RUN_AS_NODE, '1');
  assert.equal(input.env.DSH_PTY_CONSOLE_EXECUTABLE, undefined);
});

test('passes through ordinary shells, unrelated runners and already bridged calls', () => {
  for (const argv of [['pwsh', '-NoProfile'], [executable, 'D:\\unrelated.mjs']]) {
    const input = { ...fixture(), argv };
    assert.equal(bridgeSpec(input, options), input);
  }
  const bridged = bridgeSpec(fixture(), options);
  assert.equal(bridgeSpec(bridged, options), bridged);
});

test('does not wrap standalone Node or non-Windows environments', () => {
  const input = fixture();
  assert.equal(bridgeSpec(input, { ...options, electron: false }), input);
  assert.equal(bridgeSpec(input, { ...options, platform: 'linux' }), input);
});

test('matches case-insensitive Windows paths without changing the original arguments', () => {
  const input = fixture(); input.argv[0] = executable.toUpperCase();
  input.argv[1] = runner.replaceAll('\\', '/').toUpperCase();
  assert.deepEqual(bridgeSpec(input, options).argv.slice(5), input.argv.slice(1));
});

test('rejects cmd expansion or command injection in arguments and the batch path', () => {
  for (const value of ['%PATH%', '!NAME!', '& echo injected', '| more', '<file', '>file', '^x', '"x"', '\r', '\n', '\0']) {
    const input = fixture(); input.argv.push(value);
    assert.throws(() => bridgeSpec(input, options), /unsupported/);
    assert.throws(() => bridgeSpec(fixture(), { ...options, batch: 'C:\\'+value+'\\bridge.cmd' }), /unsupported/);
  }
});

test('reports a missing installed batch file before spawning anything', () => {
  assert.throws(() => bridgeSpec(fixture(), { ...options, batch: 'C:\\not-present-pty-test\\bridge.cmd' }), /missing/);
});

test('exports its packaged batch as a separate CALL argument for paths with spaces', () => {
  const output = bridgeSpec(fixture(), options);
  assert.equal(output.argv[3], 'call');
  assert.equal(output.argv[4], fileURLToPath(new URL('../bridge.cmd', import.meta.url)));
});

test('disable restores a prototype method through a proxy that changes function identity', () => {
  const prototype = { spawnTerminal(spec) { return { spec, receiver: this }; } };
  const raw = Object.create(prototype);
  const service = new Proxy(raw, { get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === 'function' ? new Proxy(value, {}) : value;
  } });
  assert.notEqual(service.spawnTerminal, service.spawnTerminal);
  for (let count = 0; count < 3; count++) {
    const dispose = installBridge(service, options);
    assert.equal(service.spawnTerminal(fixture()).spec.argv[3], 'call');
    assert.throws(() => installBridge(service, options), /already enabled/);
    dispose(); dispose();
    assert.equal(Object.hasOwn(raw, 'spawnTerminal'), false);
    const input = fixture();
    assert.equal(service.spawnTerminal(input).spec, input);
  }
});

test('disable restores an existing own descriptor and preserves a later foreign replacement', () => {
  const original = function (spec) { return spec; };
  const service = {};
  Object.defineProperty(service, 'spawnTerminal', { value: original, configurable: true, writable: true, enumerable: true });
  const before = Object.getOwnPropertyDescriptor(service, 'spawnTerminal');
  const dispose = installBridge(service, options);
  dispose();
  assert.deepEqual(Object.getOwnPropertyDescriptor(service, 'spawnTerminal'), before);
  const second = installBridge(service, options);
  const replacement = function () {};
  service.spawnTerminal = replacement;
  second();
  assert.equal(service.spawnTerminal, replacement);
});


test('rejects every ASCII control character before a matching spawn', () => {
  for (const code of [...Array(32).keys(), 127]) {
    const input = fixture(); input.argv.push('prefix' + String.fromCharCode(code) + 'suffix');
    assert.throws(() => bridgeSpec(input, options), /unsupported/);
  }
});

test('reports an incompatible service without installing any descriptor', () => {
  const service = {};
  assert.throws(() => installBridge(service, options), /incompatible subprocess service/);
  assert.equal(Object.hasOwn(service, 'spawnTerminal'), false);
});
