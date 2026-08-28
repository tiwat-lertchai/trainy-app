# Document review frontend

## Scope

- Added the authenticated `/app/documents` route and navigation link.
- Students, assigned advisors, and assigned supervisors can list document
  metadata for an accessible placement.
- Advisors and supervisors can approve a submitted document or reject it with
  required feedback. Backend assignment checks remain authoritative.
- Added Thai document type/status labels plus loading, empty, and error states.
- Added presentation-rule tests for terminal states and reviewer eligibility.
- Students can upload PDF, JPEG, and PNG files up to 20 MiB directly to the
  Trainy server and placement participants can download them through an
  authenticated endpoint.

## Direct server storage

Files are stored under `UPLOAD_DIR` (default `uploads`) using server-generated
opaque names grouped by placement. The directory is Git-ignored and is never
served statically. Upload and download both require authenticated placement
access. The server validates size, declared MIME type, and PDF/JPEG/PNG magic
bytes, prevents path traversal, and removes an uploaded file if the database
write fails. Production must mount `UPLOAD_DIR` on persistent storage and back
it up together with the database.

## Files

- `client/src/features/documents/document-page.tsx`
- `client/src/features/documents/document-rules.ts`
- `client/src/features/documents/document-rules.test.ts`
- `client/src/routes/app.documents.tsx`
- `client/src/features/dashboard/app-dashboard.tsx`
- generated `client/src/routeTree.gen.ts`
- `server/src/modules/documents/document-storage.ts`
- `server/src/modules/documents/document.route.ts`
- `server/src/modules/documents/document.service.ts`
- document storage, service, body-limit, and API documentation tests

## Verification

- Targeted document storage and service tests: 9 passed.
- Full server tests: 111 passed.
- Full client tests: 33 passed.
- Repository TypeScript, lint, and production build: passed.
- Dependency audit: 308 packages checked; no known vulnerabilities.
- Git whitespace validation: passed.

## Commit

- `224ec12 feat(documents): add review workflow ui`
- Committed locally on `master`; not pushed.

## Follow-up

- Mount `UPLOAD_DIR` on persistent storage and include it in backups before
  production deployment.
- Add streaming multipart processing if the per-file limit is raised beyond
  20 MiB; the current implementation buffers each validated upload in memory.
- Add upload progress, cancellation, and retry behavior.
- Add an explicit confirmation dialog before terminal document review actions.
