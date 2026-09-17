# CWIE records, supervision, and monthly certification

## Scope

Implemented the CWIE operational workflows that were missing from Trainy:

- structured daily logs, weekly plans, and experience/skill records;
- supervision visits 1-3, including scheduling, edits, history, and visit reports;
- monthly summaries with separate advisor and workplace-supervisor certification;
- role-aware client screens for students, advisors, and workplace supervisors.

Automatic document generation is intentionally out of scope and remains the next product increment.

## Systems and files changed

- Added the CWIE database model in `server/src/db/schema/cwie.ts` and exported it from the schema index.
- Added migration `server/drizzle/0018_equal_morlun.sql` and its Drizzle metadata.
- Added the CWIE route, validation, service, repository, and service tests under `server/src/modules/cwie/`.
- Mounted `/api/v1/cwie` in `server/src/app.ts` and documented the API in `server/docs/api-reference.md`.
- Added authenticated cross-tenant and role-escalation coverage in `server/src/security.authenticated-idor.integration.ts`.
- Added `client/src/features/cwie/` and `client/src/routes/app.cwie.tsx`, including localized labels and role navigation updates.
- Updated `requirements.md` with the delivered CWIE workflows.

## Important decisions

- A submitted record is immutable until a reviewer requests revision.
- Advisor and workplace-supervisor decisions are stored independently. Both approvals are required for final approval/certification.
- Only the assigned advisor can schedule or complete a supervision visit.
- All CWIE access is scoped to the placement participant relationship; unrelated users receive a privacy-preserving not-found response.
- Certification is an auditable electronic attestation (reviewer identity and timestamp), not a cryptographic or image-based signature.
- Completed supervision visits are immutable.

## Dependency changes

No dependency or lockfile change was introduced by this task. `bun audit` reported no known vulnerabilities across 312 packages.

## Verification

- `bun audit` — passed, no vulnerabilities found.
- `bun run test` — passed: server 194 tests, client 78 tests.
- `bun run type-check` — passed.
- `bun run lint` — passed.
- `bun run build` — passed.
- `bun test ./src/security.authenticated-idor.integration.ts` — passed, 18 tests.
- `bun run test:integration` — passed: organization 2, onboarding 3, student profile 1, internships 4, internship requests 2, placements 6, authenticated IDOR/role escalation 18, state abuse 10.
- Drizzle migrations through `0018_equal_morlun.sql` were applied to a disposable PostgreSQL 17 database; all three CWIE tables were verified.
- OWASP-aligned anonymous black-box checks were run from a disposable Kali container against the local server and client. The new routes returned 401 before body processing, untrusted CORS origins received no ACAO header, the trusted local origin was allowed, API security headers were present, and the Vite backend-file probe returned 403. No new exploitable issue was found.
- `git diff --check` — passed.

## Known limitations

- Automatic document generation/export is not included.
- The browser UI was production-built and its rules were unit-tested, but a full authenticated manual walkthrough was not possible without interactive LINE accounts for all three roles. The same role and tenant boundaries were exercised through integration tests.

## Commit information

No commit was created because the working tree already contains extensive user-owned changes, including overlapping files. Leaving the implementation uncommitted avoids capturing unrelated work in this task's commit.

## Suggested next steps

1. Define the required CWIE document templates and official output formats.
2. Generate documents only from approved/certified snapshots so later draft edits cannot change an issued document.
3. Add versioned PDF/DOCX artifacts, issuance metadata, and download permissions to the existing document workflow.
