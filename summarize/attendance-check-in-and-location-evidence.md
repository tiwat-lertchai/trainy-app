# Attendance and location evidence

## Scope and outcome

Full attendance feature: weekly work schedules, student check-in/check-out
with optional GPS evidence, time-adjustment requests and review, and a
university-wide attendance summary. Backend and frontend are both complete
and pass local verification.

## Decisions

- Location is captured only when the student explicitly checks in or out;
  continuous tracking is prohibited.
- Each schedule chooses `disabled`, `optional`, or `required_onsite` location
  policy. `required_onsite` requires a geofence.
- Required onsite location supports a student-provided exception reason so a
  GPS failure does not silently erase attendance.
- The server is the source of truth for all timestamps; client-supplied
  timestamps are never accepted.
- The initial supported timezone is fixed to `Asia/Bangkok`.
- A placement has at most one pending adjustment request at a time; approval
  recalculates status and net minutes from the corrected times.

## Files and systems changed

Backend (`server/`):
- `src/db/schema/attendance.ts`, migration `drizzle/0008_faithful_killmonger.sql`
  — schedule, attendance record, and adjustment tables.
- `src/modules/attendance/attendance.schema.ts` — Zod validation (coordinate
  bounds, geofence rules, exclusive location/exception-reason).
- `src/modules/attendance/attendance.repository.ts` — Drizzle repository with
  transactions for schedule replacement and adjustment review.
- `src/modules/attendance/attendance.service.ts` — role/tenant authorization
  for every operation, geofence evaluation, status/duration calculation.
  Fixed two pre-existing bugs found during verification: a missing
  `AttendancePlacement` type import and an unsound weekday lookup that could
  produce `undefined`.
- `src/modules/attendance/attendance.route.ts` — new HTTP routes, mounted at
  `/api/v1/attendance` in `src/app.ts`.
- `src/modules/attendance/attendance.service.test.ts` — 21 new unit tests
  covering authorization, geofence, duplicate/ordering guards, and
  adjustment review.
- `src/app.test.ts` — added an unauthenticated-access check for the new
  routes, consistent with the other route families in that file.
- `docs/api-reference.md`, `src/api-documentation.test.ts` — documented the
  new endpoints and enforced the doc-coverage test.

Frontend (`client/`):
- `src/features/attendance/attendance-rules.ts` (+ test) — pure
  role/status/formatting helpers.
- `src/features/attendance/attendance-location.ts` — thin wrapper around
  `navigator.geolocation`, only invoked from a user-initiated click so the
  browser permission prompt appears at the right time.
- `src/features/attendance/attendance-page.tsx` — single page covering
  schedule management (company admin), check-in/check-out (student),
  attendance history, adjustment requests and review (student/advisor/
  supervisor), and the university summary (university admin/coordinator/
  advisor).
- `src/routes/app.attendance.tsx`, `src/features/organizations/role-navigation.ts`,
  `src/features/dashboard/app-dashboard.tsx` — new route wired into the
  sidebar for every role that touches attendance.
- `.claude/launch.json` — added so the client dev server can be previewed
  with the browser tool (`bun --cwd client run dev` on port 5173).

Note: `client/src/features/progress/`, `client/src/routes/app.progress.tsx`,
and the `progress` line in `server/src/db/schema/index.ts` are a separate,
already-backend-complete feature (internship progress reports) that predates
this session's attendance work. They were not touched here.

## Dependency changes

None. No lockfile changes; the earlier dependency audit (308 packages, no
known vulnerabilities) still applies.

## Verification commands and results

- `cd server && bun run type-check` — pass
- `cd server && bun run build` (tsc) — pass
- `cd server && bun test src` — 97 pass, 0 fail (21 new in the attendance
  module)
- `cd client && bun test src` — 28 pass, 0 fail (6 new)
- `cd client && bun run build` (tsc -b && vite build) — pass
- `bun run lint` (root, turbo → client eslint) — pass, 0 warnings/errors
- `bun run build` / `bun run test` (root, turbo, all packages) — pass

Manual browser check: started the Vite dev client, navigated to
`/app/attendance` with no backend session — it correctly falls back to the
sign-in screen with no console errors or crashes, confirming the route and
bundle are sound.

## Known limitations

No local Postgres/Neon database or LINE OAuth credentials are configured in
this environment, so the authenticated UI flows (schedule form submission,
check-in/out with a real geolocation prompt, adjustment review, university
summary numbers) were **not** exercised end-to-end in a logged-in browser
session. Backend behavior for these flows is covered by the 21 new service
unit tests instead. This should be manually verified against a real
environment before relying on it in production.

## Commit information

Not yet committed — pending user confirmation, and the project's migration
policy required the full feature (not just the backend) to pass verification
first, which is now the case.

## Suggested next steps

1. Manually exercise the authenticated flows against a real database and
   LINE login (schedule save, check-in/out with real GPS, adjustment
   approve/reject, university summary) before shipping.
2. Consider adding a lightweight in-app permission explainer before the
   browser's native geolocation prompt, since `required_onsite` schedules
   will otherwise show a bare browser dialog with no context.
3. Apply migration `0008_faithful_killmonger.sql` to a real database and
   confirm it runs cleanly, since it has not been applied anywhere yet.
