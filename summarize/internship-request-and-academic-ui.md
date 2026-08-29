# Internship request and academic workflow UI

## Scope and outcome

- Added the missing frontend for self-sourced internship requests.
- Students can choose their faculty, major, advisor, training type, dates,
  proposed company, contact details, and work description; submit a request;
  track sequential approvals; cancel an open request; and resubmit after a
  revision request.
- Assigned advisors, program chairs, coordinators, and university admins can
  see only requests returned by the protected review endpoint and approve,
  reject, or request revision for the currently active step.
- Advisors now receive the Applications navigation item needed to reach their
  assigned review queue.
- Completed the existing academic administration screen by allowing university
  admins to assign an active advisor as program chair and allowing university
  admins/coordinators to maintain student GPA and prerequisite information.
- Coordinators now receive the Academic navigation item needed for that work.

## Files changed

- `client/src/features/applications/application-page.tsx`
- `client/src/features/applications/internship-request-panel.tsx`
- `client/src/features/applications/internship-request-rules.ts`
- `client/src/features/applications/internship-request-rules.test.ts`
- `client/src/features/academic/academic-admin-page.tsx`
- `client/src/features/organizations/role-navigation.ts`

## Dependencies

- No dependency or lockfile changes.

## Verification

- `bun run --filter client test` — pass, 49 tests.
- `bun run --filter client build` — pass, including TypeScript compilation.
- `bun run --filter client lint` — pass.
- `git diff --check` — pass.

## Known limitations

- The UI consumes the existing backend contracts but has not been manually
  exercised with real LINE-authenticated role accounts.
- Resubmission currently reopens the existing values. Editing a
  revision-requested request requires a follow-up backend request-body contract.
- Generated cooperation/referral document bytes remain a separate backend gap.

## Commit information

- Local commit message: `feat(workflow): complete internship request and academic UI`.
- No push requested or performed.

## Suggested next steps

- Add editable resubmission fields to the backend and UI.
- Generate and expose the approved request documents.
- Run the authenticated end-to-end and security pass with representative roles.
