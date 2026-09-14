# Version 0.2 requirements foundation

## Scope and outcome

- Audited the existing backend and frontend against `requirements.md` and
  recorded the required state machines, deny-by-default permission model,
  system boundaries, migration order, acceptance-criteria traceability, and
  unresolved policy decisions.
- Updated the application shell with role-specific primary navigation, a
  mobile bottom navigation bar, and an account menu. Routes that still require
  backend contracts remain visibly disabled instead of linking to placeholders.
- Improved the shared confirmation dialog with unique accessible labels,
  keyboard focus containment, Escape handling, focus restoration, scroll
  locking, and responsive bottom-sheet presentation on mobile.
- Added an infrastructure-free verification gate and GitHub Actions workflow,
  including dependency audit, formatting, all-workspace TypeScript checks,
  client lint, unit/contract tests, and production builds.
- Repaired a date-sensitive invite-service test fixture that had expired in
  September 2026.

## Files and systems changed

- Client shell, role navigation, confirmation dialog, translations, and focused
  tests under `client/src/`.
- Root, client, and shared package scripts; `.github/workflows/verify.yml`.
- Root README verification instructions.
- `server/docs/v0.2-domain-and-access-design.md`.
- Invite service test fixture and Markdown formatting needed by the new gate.

## Important decisions

- Runtime authentication and authorization behavior was not changed because
  approval authority, identity evidence, advisor scope, retention, and
  evaluation disclosure remain open product or institutional decisions.
- Missing History, Advisor Students, Settings, Help, and advisor Profile routes
  are disabled in navigation until real backend contracts and pages exist.
- No new dependency was introduced. The required Noto Sans Thai Looped font
  change remains a separate dependency and visual-verification task.
- Existing real backend integrations and tenant-aware navigation were retained.

## Verification

- `bun audit` - passed; 310 packages checked, no known vulnerabilities.
- `bun install --frozen-lockfile` - passed without lockfile changes.
- `bun run verify:fast` - passed after the coordinated changes: formatting,
  all-workspace TypeScript checks, client lint, 229 unit/contract tests, and
  production builds.
- `git diff --check` - passed.
- PostgreSQL integration tests were not run because no local database was
  available during the audit (`ECONNREFUSED`).
- No security boundary changed in this increment, so the disposable-Kali
  black-box pass was not required for these client/documentation/CI changes.

## Known limitations and next steps

- Version 0.2 is not complete. Highest-priority runtime work is the
  provider-independent account state and active-account gate, followed by
  verified email/password recovery, non-automatic role approval, and privacy
  acknowledgement.
- Advisor Students, role-specific home read models, History, profile expansion,
  request drafts/idempotency/downloads, evaluation rounds/disclosure, and
  notification deep links still require implementation.
- Resolve the blockers in `server/docs/v0.2-domain-and-access-design.md` before
  changing authorization, approval, retention, or disclosure behavior.
- Run PostgreSQL integration tests and the required OWASP-aligned self-pentest
  for the next security-relevant backend increment.

## Commit information

- Planned local commit: `feat(app): establish v0.2 delivery foundation`.
- No push requested or performed.
