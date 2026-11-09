import { existsSync } from 'node:fs';
import { win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'windows-pty-console-bridge';
export const inject = ['subprocess'];

const owner = Symbol.for('dsh-windows-pty-console-bridge.owner');
const unsafe = /[\x00-\x1f\x7f"%!&|<>^]/;
const defaultBatch = fileURLToPath(new URL('./bridge.cmd', import.meta.url));

/**
 * Give only the packaged Electron Windows ACL runner a console owner.
 * Preserve the runner, policy arguments, working directory and cancellation.
 * Ordinary shells, CLI Node and non-Windows processes pass through unchanged.
 */
export function bridgeSpec(spec, options = {}) {
  const platform = options.platform ?? process.platform;
  const executable = options.executable ?? process.execPath;
  const electron = options.electron ?? Boolean(process.versions.electron);
  if (platform !== 'win32' || !electron) return spec;
  const runner = win32.join(win32.dirname(executable), 'resources', 'app.asar', 'dsh',
    'node_modules', '@deepseek-ai', 'dsh-sandbox-windows-acl', 'lib', 'runner.js');
  const samePath = (a, b) => typeof a === 'string'
    && win32.resolve(a).toLowerCase() === win32.resolve(b).toLowerCase();
  if (!samePath(spec.argv[0], executable) || !samePath(spec.argv[1], runner)) return spec;
  const batch = options.batch ?? defaultBatch;
  // CALL and cmd expand these inside quoted arguments too. Never alter policy paths.
  if ([...spec.argv, batch].some(value => unsafe.test(value))) {
    throw new Error('Windows PTY bridge: paths/arguments containing quotes, %, !, &, |, <, >, ^ or control characters are unsupported');
  }
  if (!existsSync(batch)) throw new Error('Windows PTY bridge: bridge.cmd is missing; reinstall the plugin');
  const systemRoot = options.systemRoot ?? process.env.SystemRoot ?? 'C:\\Windows';
  return {
    ...spec,
    // CALL makes a quoted batch path work even when the package path contains spaces.
    argv: [win32.join(systemRoot, 'System32', 'cmd.exe'), '/d', '/c', 'call', batch,
      ...spec.argv.slice(1)],
    env: { ...spec.env, ELECTRON_RUN_AS_NODE: '1', DSH_PTY_CONSOLE_EXECUTABLE: executable },
  };
}

/** Install a reversible method descriptor, including through Cordis tracing proxies. */
export function installBridge(service, options = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(service, 'spawnTerminal');
  const original = descriptor?.value ?? service.spawnTerminal;
  if (typeof original !== 'function') {
    throw new Error('Windows PTY bridge: incompatible subprocess service; spawnTerminal is unavailable');
  }
  if (original[owner]) throw new Error('Windows PTY bridge is already enabled on this subprocess service');
  const bridged = function (spec) { return original.call(this, bridgeSpec(spec, options)); };
  Object.defineProperty(bridged, owner, { value: true });
  Object.defineProperty(service, 'spawnTerminal', {
    configurable: true, writable: true, enumerable: descriptor?.enumerable ?? false, value: bridged,
  });
  return () => {
    // Cordis returns a fresh tracing proxy on every method read; compare descriptors.
    if (Object.getOwnPropertyDescriptor(service, 'spawnTerminal')?.value !== bridged) return;
    if (descriptor) Object.defineProperty(service, 'spawnTerminal', descriptor);
    else Reflect.deleteProperty(service, 'spawnTerminal');
  };
}

/** Register setup and restoration in the same plugin effect lifetime. */
export function apply(ctx) {
  if (process.platform !== 'win32' || !process.versions.electron) return;
  ctx.effect(() => installBridge(ctx.subprocess));
}
