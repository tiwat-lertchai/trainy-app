# Evaluation frontend workflow

## Scope

- Added authenticated `/app/evaluations` route and navigation.
- Assigned advisors and supervisors can create, edit, and save one draft for
  their evaluator type, then explicitly confirm the immutable submission.
- Students see only submitted evaluations with three scores and comments.
- Added loading, empty, error, role-aware visibility, and terminal-state UI.
- Tightened the backend list contract so one evaluator cannot read the other
  evaluator's draft; submitted evaluations remain visible to participants.

## Security and workflow decisions

- Backend assignment and placement-state checks remain authoritative.
- Drafts are visible only to their evaluator owner.
- Submitted evaluations are immutable and student-visible.
- Submission uses an explicit confirmation state warning that it cannot be
  edited afterward.

## Files

- `client/src/features/evaluations/evaluation-page.tsx`
- `client/src/features/evaluations/evaluation-rules.ts`
- `client/src/features/evaluations/evaluation-rules.test.ts`
- `client/src/routes/app.evaluations.tsx`
- `client/src/features/dashboard/app-dashboard.tsx`
- generated `client/src/routeTree.gen.ts`
- `server/src/modules/evaluations/evaluation.service.ts`
- `server/src/modules/evaluations/evaluation.service.test.ts`

## Dependencies

None.

## Verification

- Targeted frontend presentation tests: 3 passed.
- Targeted evaluation service tests: 6 passed.
- Client production build and lint: passed.
- Server TypeScript check: passed.
- Full repository tests: server 112 passed; client 36 passed.
- Full repository TypeScript, lint, production build, dependency audit, and
  whitespace validation: passed.

## Commit

- `dd10e58 feat(evaluations): add submission workflow ui`
- Committed locally on `master`; not pushed.

## Follow-up

- Perform a real authenticated browser pass with assigned advisor and
  supervisor accounts when those accounts are available.
- Move authenticated Thai copy into the shared translation dictionaries.
