# Academic admin UI (faculty/major management)

## Scope and outcome

Follow-up to [onboarding-academic-structure.md](onboarding-academic-structure.md):
the backend for faculties/majors existed but had no UI for a
`university_admin` to manage their own university's list — only the raw
API. Added an admin page.

## Decisions

- Restricted to the `university_admin` role only, matching the backend's
  authorization (`ORGANIZATION_ADMIN_REQUIRED` on write). A non-admin
  visiting the route sees a plain "this page is for university admins
  only" message rather than a broken/empty page.
- Uses the signed-in admin's own workspace organization — no organization
  picker, since this manages faculties/majors for "my university," not an
  arbitrary one.
- Faculty list is expandable per-row to reveal/add its majors, avoiding an
  N+1 fetch of every faculty's majors up front.

## Files changed

- `client/src/features/academic/academic-admin-page.tsx` — new page: add
  faculty, expand a faculty to view/add its majors.
- `client/src/routes/app.academic.tsx` — new route at `/app/academic`.
- `client/src/features/organizations/role-navigation.ts` — new `academic`
  nav key, added only to `university_admin`'s navigation list.
- `client/src/features/dashboard/app-dashboard.tsx` — nav icon/label and
  link, same additive pattern as the existing `attendance`/`progress`
  entries.

## Verification commands and results

- `cd client && bun run build` (tsc -b + vite build) — pass
- `cd client && bun test src` — 30 pass, 0 fail (unchanged; no new pure
  logic worth a dedicated unit test in this page)
- `cd client && bun run lint` — pass
- Live browser check (attached to the user's real authenticated session,
  who is a `student` in the seeded university): navigating to
  `/app/academic` correctly renders the restricted-access message instead
  of the admin form — confirms the route and role guard both work.
- Direct verification against the real database with a temporary synthetic
  university and a `university_admin` membership for the same real user id
  (not their real university — a throwaway org, deleted after): called
  `AcademicService.createFaculty`/`createMajor` as an authorized admin
  (succeeded), then as an unauthorized actor (correctly rejected with
  `ORGANIZATION_ADMIN_REQUIRED`), then `listFaculties` (succeeded, no auth
  required). All synthetic data deleted afterward; confirmed only the real
  seeded university remains.

## Known limitations

The admin form itself (adding a faculty/major through the actual UI, not
the service directly) was not click-tested in the browser, since the only
available real account is a student, not a university_admin, and creating
a second real LINE-authenticated account isn't something to script.
Backend authorization and data flow are verified directly (above); the
remaining gap is purely "does the form submit correctly," which is a
standard, low-risk React form using the same patterns already proven in
the onboarding and attendance pages.

## Commit information

Not yet committed — pending user confirmation.

## Suggested next steps

If a second real `university_admin` account becomes available (e.g. after
someone actually goes through onboarding as one and gets CWIE-approved),
do one manual click-through of the add-faculty/add-major forms to close
the remaining gap above.
