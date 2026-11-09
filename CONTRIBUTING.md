# Contributing

Open an issue describing the Harness version, Windows version, installation method, permission mode and sanitized error. Do not upload profiles, session transcripts, credentials, workspace ACL dumps or private paths.

Before a pull request run `npm test`, `npm run release:build` and `npm run release:verify`. Keep runtime code dependency-free and restrict the wrapper to the packaged Windows Electron ACL runner. New lifecycle behavior must remain reversible through Cordis proxies. Never use a full-access fallback to make tests pass.

For Desktop acceptance, finish active work before restarting. Install via the official plugin manager, test one PowerShell command in workspace-write mode, disable/re-enable and retest. Record only the tested version and a sanitized result. CI validates units/packaging, not an installed Desktop.

For a release, update package.json and CHANGELOG.md together, run the checks, commit, and tag `v<version>`. The GitHub workflow builds and uploads tgz, ZIP and checksums. Review `npm pack --dry-run --json` before publishing. Avoid committing generated dist files.
