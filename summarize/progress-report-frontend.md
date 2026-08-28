# Progress report frontend workflow

## Scope

- Added the authenticated `/app/progress` route and placement-aware report UI.
- Students can create drafts, edit draft or revision-requested reports, submit,
  and resubmit after feedback.
- Assigned advisors and supervisors can approve or request revision with an
  explicit feedback form.
- Added loading, empty, and error states plus report status presentation.
- Fixed `ProgressService.update()` to return the updated record instead of an
  undefined API payload, with regression coverage in the existing lifecycle test.

## Security and workflow decisions

- Backend ownership and assigned-reviewer checks remain authoritative.
- Submitted and approved content remains immutable.
- Revision feedback is required and is entered in an in-app form.
- Placement access is loaded only through existing protected endpoints.

## Files

- `client/src/features/progress/progress-page.tsx`
- `client/src/features/progress/progress-rules.ts`
- `client/src/features/progress/progress-rules.test.ts`
- `client/src/routes/app.progress.tsx`
- `server/src/modules/progress/progress.service.ts`
- `server/src/modules/progress/progress.service.test.ts`

## Dependency changes

None. Audit checked 308 packages and found no known vulnerabilities.

## Verification

- Targeted progress service tests: 6 passed.
- Client tests: 30 passed.
- Client lint: passed.
- Client production build: passed.
- Server TypeScript check: passed.
- Full repository tests: server 106 passed; client 30 passed.
- Full repository TypeScript, lint, and production build: passed.
- Final dependency audit: 308 packages checked, no known vulnerabilities.
- Git whitespace validation: passed.

## Follow-up

- Replace manually entered hours with approved attendance totals after the
  attendance-to-progress aggregation contract is finalized.
- Move authenticated copy into the shared Thai/English dictionaries.
