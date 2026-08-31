# Student self-arranged internship request entry

## Outcome

Added a clear student-facing page and call-to-action for submitting a self-arranged internship request. Students no longer need to discover the request form at the bottom of the general applications page.

## Changes

- Added `/app/internship-request` as a typed TanStack Router route.
- Added a dedicated page that resolves the active university workspace, restricts the form to student memberships, and renders the existing real internship-request workflow.
- Added prominent actions at the top of the student applications page for both browsing published positions and submitting a self-arranged request.
- Removed the duplicate student request form from the bottom of the applications list; university reviewers retain their existing review queue there.
- Added Thai and English messages for the new actions, loading/error states, access restriction, and back navigation.
- Added tests for the direct route paths and student-only presentation rule.

## Architecture and security

No backend or database changes were required. The new page uses the existing authenticated internship-request API, whose service already verifies active student membership, university tenant boundaries, advisor assignment, program-chair configuration, and ordered university review steps. The client-side role check improves presentation but is not relied upon for authorization.

## Dependency review

- `bun audit`: passed; no vulnerabilities were found across 310 packages.
- No dependencies or lockfiles changed.

## Verification

- Targeted application-navigation, internship-request, and i18n tests: passed (7 tests).
- `bun run test`: passed (153 server tests and 52 client tests).
- `bun run type-check`: passed.
- `bun run lint`: passed.
- `bun run build`: passed.
- Root `bun run fmt:check`: blocked by the preserved user-owned `reports/owasp-security-report-2026-08-31.md` and a pre-existing formatting issue in `summarize/security-review-2026-08-30.md`.
- All files changed by this task were formatted and checked separately.

## Known limitation

This increment exposes the existing self-arranged internship request. Selecting specific university document outputs and adding staff-only document metadata fields remain separate workflow enhancements.
