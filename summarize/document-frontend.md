# Document review frontend

## Scope

- Added the authenticated `/app/documents` route and navigation link.
- Students, assigned advisors, and assigned supervisors can list document
  metadata for an accessible placement.
- Advisors and supervisors can approve a submitted document or reject it with
  required feedback. Backend assignment checks remain authoritative.
- Added Thai document type/status labels plus loading, empty, and error states.
- Added presentation-rule tests for terminal states and reviewer eligibility.

## Storage boundary

The backend currently accepts an already-created `storageKey` and validated
metadata, but it does not provide object upload or signed-upload endpoints. The
frontend therefore does not show a fake upload control or create document rows
without file bytes. Students see an explicit storage-unavailable notice and can
use this page to track existing document review status and feedback.

Selecting an object-storage provider and defining a signed-upload contract is
required before enabling student file submission. The future flow should upload
bytes first, then persist metadata only after storage confirms success.

## Files

- `client/src/features/documents/document-page.tsx`
- `client/src/features/documents/document-rules.ts`
- `client/src/features/documents/document-rules.test.ts`
- `client/src/routes/app.documents.tsx`
- `client/src/features/dashboard/app-dashboard.tsx`
- generated `client/src/routeTree.gen.ts`

## Verification

- Targeted document frontend tests: 2 passed.
- Full server tests: 106 passed.
- Full client tests: 32 passed.
- Repository TypeScript, lint, and production build: passed.
- Dependency audit: 308 packages checked; no known vulnerabilities.
- Git whitespace validation: passed.

## Commit

- `e8c3126 feat(documents): add review workflow ui`
- Committed locally on `master`; not pushed.

## Follow-up

- Choose the real object-storage provider.
- Add server-authorized signed upload and download contracts.
- Add upload progress, cancellation, retry, and orphan cleanup behavior.
- Add an explicit confirmation dialog before terminal document review actions.
