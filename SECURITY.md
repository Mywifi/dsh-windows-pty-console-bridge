# Security

The bridge intentionally retains the existing Windows ACL sandbox runner and all policy arguments. It does not request full access, alter ACL policy, patch Harness binaries, collect telemetry or contact network services.

CMD/CALL expansion characters and ASCII controls are rejected for matching invocations. Treat a rejection as a compatibility error; do not remove the guard to force a private path through. Disable/uninstall the plugin to return to the host's original behavior.

Report suspected vulnerabilities through this repository's GitHub private vulnerability reporting facility if available. Otherwise open an issue without secrets or exploit-sensitive details and request a private contact channel. Do not post user profiles, tokens, session logs, full environment dumps or personal directory listings.

Only the explicitly documented host version has original Desktop acceptance. Future host versions require a fresh check. SHA-256 files establish integrity relative to the release, not independent publisher authentication.
