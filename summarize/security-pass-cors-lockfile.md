# Production security pass: CORS and dependency lockfile

## Scope and outcome

- Ran an OWASP-aligned black-box pass against the production Compose stack
  from a disposable Kali container on the host network.
- Fixed CORS/trusted-origin configuration so a configured URL with a trailing
  slash is canonicalized to the browser's origin form before exact matching.
- Removed the obsolete `server/bun.lock`. The monorepo uses the root lockfile;
  the stale nested file pinned Hono 4.7.7 and caused vulnerability scanners to
  report 39 fixed advisories even though production installs Hono 4.13.5.
- Kept the client container healthcheck on IPv4 loopback, matching nginx's
  listener and avoiding false unhealthy status when `localhost` resolves to
  IPv6 first.

## Security verification

- Production Compose images built and all app containers became healthy.
- Nmap exposed only nginx on port 8081; server and PostgreSQL were not
  published to the host.
- Client and API security headers were present, TRACE returned 405, protected
  internship-request endpoints returned 401 before domain processing, and
  attacker/null origins received no CORS allow-origin header.
- Nikto path findings were confirmed false positives: suspicious paths returned
  the exact same SHA-256 body as the SPA index and did not expose host files.
- Live retest confirmed `Origin: https://trainy.snowy.page` receives the correct
  allow-origin header when configuration contains a trailing slash.
- OSV-Scanner v2.4.0 scanned the root Bun lockfile (329 packages): no known
  vulnerabilities found after removal of the stale nested lockfile.
- Static checks found no tracked credential signatures or unsafe dynamic-code
  sinks in production code.

## Verification commands

- Targeted app/auth tests: 16 passed.
- Repository type-check, lint, and production build: passed.
- `git diff --check`: passed.

## Dependencies

- No package version or root lockfile changes.
- Deleted only the obsolete nested `server/bun.lock`.

## Commit information

- Local commit message: `fix(security): normalize trusted origins and remove stale lockfile`.
- No credentials, local `.env` contents, or persistent test data are included.

## Known limitations

- Real LINE OAuth was not scripted. Existing service-level authenticated IDOR
  and state-abuse integration tests remain the coverage for multi-role abuse.
