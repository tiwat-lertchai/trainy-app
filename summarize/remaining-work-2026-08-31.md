# Remaining work snapshot - 2026-08-31

## Purpose

This snapshot replaces stale task lists that predate the completed progress,
document, evaluation, internship-request, academic, i18n, Docker, and security
passes. It records only gaps that are still current at commit `e523d1e`.

## Current baseline

- `master` is aligned with `origin/master`.
- Core backend and frontend workflows are implemented for authentication,
  onboarding, organizations, academics, internships/applications,
  self-sourced requests and approval, placements, attendance, progress,
  documents, evaluations, notifications, and reports.
- The production Compose stack builds and becomes healthy behind a same-origin
  nginx proxy.
- The latest automated baseline passed 146 server tests, 49 client tests, 39
  PostgreSQL integration tests (twice consecutively), repository type-check,
  lint, formatting, and production build.
- OSV-Scanner v2.4.0 found no known vulnerabilities in the active root Bun
  lockfile after the obsolete nested server lockfile was removed.

## Product gaps - priority order

Editable internship-request resubmission is complete; see
`summarize/editable-internship-request-resubmission.md`.

### 1. Official request-document generation

Approved self-sourced requests create cooperation-request and referral-letter
metadata rows without file bytes. Implementation is blocked on official
institutional inputs:

- Word/PDF templates and letterhead/logo assets;
- document numbering and issue-date rules;
- authorized signatory and signature/snapshot policy;
- exact NORMAL versus CWIE document requirements;
- retention, regeneration, and download authorization rules.

After those decisions, generate deterministic PDFs, store them through durable
document storage, expose authenticated downloads, and visually verify representative
Thai documents.

### 2. Proposed-company handoff

Connect an approved request for a company that is not registered to the existing
invite flow. Redemption must associate the resulting company organization with
the request before `placements/from-request` can succeed. Add idempotency,
expiration/revocation behavior, notifications, and end-to-end tests.

### 3. Complete authenticated i18n

The shell and several management surfaces are bilingual, but detailed feature
pages still contain Thai literals. Migrate applications/internship requests,
attendance, documents, evaluations, internships, onboarding, placements,
progress, and invite management into typed Thai/English message keys. Preserve
locale-aware dates and interpolation word order.

### 4. Real authenticated E2E verification

Automated unit, integration, IDOR, state-abuse, and black-box anonymous checks
pass. A production release still needs representative LINE-authenticated role
accounts to exercise OAuth/session cookies and the complete browser workflow,
including GPS permission, uploads/downloads, request approval, placement
activation, reports, and evaluation submission.

## Production operations

- Apply and verify all migrations on the intended database; bootstrap the first
  `platform_staff` reviewer through an authorized operator process.
- Replace or durably mount `UPLOAD_DIR`, define backup/restore procedures, and
  test recovery together with database backups.
- Add CI gates for tests, type-check, lint, formatting, build, OSV scanning, and
  Docker image build/publish.
- Add structured production monitoring/error reporting, health/backup alerts,
  and public-endpoint rate limiting.
- Confirm academic seed data against an official university source.
- Optimize the server image only if its full-workspace install becomes an
  operational cost problem.

## Secondary UX improvements

- Upload progress, cancellation, and retry.
- Confirmation dialogs for every remaining irreversible action.
- Attendance-to-progress approved-hours aggregation after its policy is fixed.
- Manual accessibility and responsive-layout review across every role.

## Dependencies and changes

- Documentation-only task; no dependency, schema, API, or runtime change.

## Verification

- Compared repository status, recent commits, current routes/modules, and the
  latest task summaries.
- Confirmed the repository was clean and synchronized before writing this
  snapshot.

## Commit information

- Local commit message: `docs(project): record current remaining work`.
- The `chats/` message is intentionally Git-ignored and is not included in the
  commit.
