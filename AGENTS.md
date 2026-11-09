# Contributor instructions

This is a standalone, host-only DeepSeek Harness Cordis bundle. Read the upstream `cordis-plugin-development` skill and relevant Host/lifecycle/verification references before changing its integration.

- Keep runtime dependency-free. Do not modify Harness binaries or weaken sandbox permissions.
- Only wrap the packaged Electron Windows ACL runner at `subprocess.spawnTerminal`.
- Register reversible installation through `ctx.effect`; compare raw descriptors when disposing because Cordis traces functions with changing proxy identities.
- Never interpolate untrusted values into a shell. Preserve the original runner argv and reject CMD expansion characters before using CALL.
- Use official plugin UI/CLI for installation; do not hand-edit user profiles. Do not quit an active user session.
- Run `npm test`, `npm run release:build`, and `npm run release:verify` before a release. Keep version numbers derived from package.json.
- Public commits must not include local logs, credentials, user profiles, model assets, or machine-specific configuration.
- Distinguish unit/packaging checks from real Windows Desktop acceptance; do not claim untested versions are verified.
