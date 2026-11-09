# Windows PTY Console Bridge for DeepSeek Harness

[简体中文](README.zh-CN.md) · [Downloads](https://github.com/Mywifi/dsh-windows-pty-console-bridge/releases) · MIT

A host-only Cordis plugin for DeepSeek Harness Windows Desktop. It addresses terminals that exit immediately with **`PTY shell exited during startup`** when the packaged Electron executable starts the Windows ACL sandbox runner under ConPTY.

The plugin gives that runner a console through a small batch bridge. It preserves the original runner, sandbox policy, workspace, environment entries, cancellation signal, and terminal settings. It does not change model/API configuration or require full-access mode. It is an independent community project, not an official DeepSeek patch.

## Install

1. Download the latest `.tgz` or `-windows.zip` from [Releases](https://github.com/Mywifi/dsh-windows-pty-console-bridge/releases). Keep the extracted files in a stable directory for later repair/reinstallation.
2. In Desktop, open **Plugins → Add plugin → Install third-party plugin** and enter the absolute path to the `.tgz` file. Enable **Windows PTY Console Bridge** (Chinese title: **Windows PTY 兼容修复**).
3. Restart Desktop when the plugin manager requests it. In **workspace-write** mode, ask the agent to run just `Write-Output 'DSH_PTY_VERIFY_OK'` through the PowerShell tool and verify its actual tool result.

Alternatively, fully quit Desktop first and run the installer inside the extracted ZIP:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
# Custom installation directory:
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -HarnessDirectory "D:\Apps\DeepSeek Harness"
# Remove:
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Action Remove
```

The installer verifies the package against its included SHA-256 manifest and calls the installed official `dsh plugin --profile desktop add/remove` CLI. It never terminates Desktop or changes global execution policy. A checksum verifies file integrity; obtain both archive and checksum from this project's release.

If you previously mounted a hand-written PTY workaround, back up and remove that old entry before enabling this bundle to avoid two wrappers.

## Compatibility and upgrades

| Component | Status |
| --- | --- |
| Windows Desktop 0.2.2-rc.1 | 1.0.2 release archive verified with real workspace-write ConPTY/PowerShell execution from Unicode/spaced paths; 1.0.1 additionally verified through the Desktop tool UI |
| Cordis 4.1.0 | Real tracing-proxy lifecycle verified for the 1.0.2 archive with three enable/disable cycles; also covered by unit tests |
| Node 22+ | Development/test requirement; installed plugin uses Desktop's runtime |
| CLI Node, Linux, macOS, unrelated shell runners | Passed through unchanged |
| Future Harness releases | Require verification; no guarantee from the peer-version range |

Installation is stored in the user profile rather than patched into the application. Normal application updates should preserve that profile, but a changed subprocess service or runner layout can make this workaround ineffective. After each Harness update, repeat the PowerShell check above. If the upstream issue is fixed, disable the plugin, verify the terminal, then uninstall it. The plugin does not modify or auto-patch new Harness releases.

The current manifest declares optional host peers for Cordis 4.1 and subprocess `>=0.2.2-rc.1 <0.3.0`; this describes the intended API family, not a tested-version matrix. The bridge fails explicitly if the required service method is missing. A changed runner path is left untouched.

## How it works

`index.mjs` injects `subprocess` and installs a reversible `spawnTerminal` wrapper via `ctx.effect`. Only an argv beginning with the current Electron executable and its exact packaged `dsh-sandbox-windows-acl/lib/runner.js` path is rewritten:

```text
Electron.exe runner.js <original policy and shell arguments>
  → cmd.exe /d /c call bridge.cmd runner.js <the same arguments>
```

`bridge.cmd` launches the same Electron executable with `ELECTRON_RUN_AS_NODE=1`. Disabling restores the original property descriptor, including through Cordis tracing proxies, and avoids overwriting another plugin's later replacement.

Spaces and Unicode paths are supported. Matching runner arguments or package paths containing quotes, `%`, `!`, `&`, `|`, `<`, `>`, `^`, or ASCII control characters are rejected before spawning because CMD/CALL can expand them. Unrelated runner calls are not subject to this restriction. This is not a general fix for every terminal startup failure.

## Development and release

Requires Node.js 22+ and Python 3.10+ (release tooling only). No runtime dependencies, dependency installation, or build scripts are needed by consumers.

```sh
npm test
npm run release:build
npm run release:verify
```

The build runs `npm pack --ignore-scripts`, checks its whitelist and version, then creates an installable `.tgz`, portable Windows ZIP, and `SHA256SUMS.txt` under `dist/`. The Windows installer is encoded with a BOM for Windows PowerShell 5.1. `PYTHON` can select a Python executable. Tests cover argument/policy preservation, pass-through, command-expansion rejection, reversible lifecycle, and the actual npm pack contents. CI runs those checks on Windows and Linux with Node 22/24. CI has no installed Harness and does not prove Desktop compatibility.

Tagging `v<package version>` runs the same checks and publishes the release archives through the release workflow. See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md), and [SECURITY.md](SECURITY.md).

Upstream references: [Harness](https://github.com/deepseek-ai/deepseek-harness), [plugin development skill](https://github.com/deepseek-ai/deepseek-harness/blob/main/packages/preset/agent-preset/skills/cordis-plugin-development/SKILL.md), [lifecycle tutorial](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/cordis-tutorial/02-lifecycle-and-effects.zh.md).
