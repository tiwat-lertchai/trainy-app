# Self-sourced internship request backend (Part B of the parallel placement flow)

## Scope

Second half of the plan at `/home/tiwat/.claude/plans/wondrous-imagining-harbor.md`
(Part A — company/mentor invites — landed separately, see
`summarize/invite-system-part-a.md` and commit `391190a` for its frontend,
built by another session/agent per `chats/021-claude.md`). This task covers
Part B's backend only: the second, parallel placement path where a student
finds their own company (not the existing job-board "company posts,
student applies" flow) and gets sequential sign-off before the company even
joins the system.

## What was built

- `server/src/db/schema/internship-request.ts` — new `internship_request`,
  `internship_request_approval` (one row per step, all three created up
  front on submit), and `internship_request_document` tables, plus four new
  enums. Migration `server/drizzle/0011_square_onslaught.sql`.
- `server/src/db/schema/student-academic-record.ts` — manually maintained
  GPA/prerequisite data (no SIS integration exists), surfaced to the center
  review step as information only — never a hard block, matching the
  precedent set by onboarding's `documentsVerified` check.
- `server/src/db/schema/academic.ts` — `academicMajor` gets a nullable
  `programChairUserId`. This is an assignment, not a new system role: a
  person can only hold one `organizationRole` per organization
  (`organization_membership_org_user_uidx`), so "program chair" couldn't be
  modeled as a membership role without breaking that constraint.
- `server/src/db/schema/placement.ts` — `applicationId` and `internshipId`
  are now nullable, a nullable `requestId` was added, and a CHECK
  constraint enforces exactly one origin (`application` xor `request`) per
  placement row. This is how the two parallel paths converge back into one
  shared downstream model (progress reports, evaluations, attendance work
  unchanged regardless of origin).
- New module `server/src/modules/internship-requests/`, mirroring the
  onboarding/invites module shape. The core is `reviewStep()`'s state
  machine: steps must be approved strictly in order (advisor →
  program_chair → center); the advisor/program_chair steps require the
  specific assigned reviewer, the center step requires any active
  `coordinator`/`university_admin` at that university (claimed on decide,
  same "any qualified role, no single assignee" pattern
  `placement.service.ts` already used); a rejection at any step kills the
  whole request immediately; `revision_requested` sends it back to the
  student, who resubmits (resetting every step back to `pending`, same
  shape as `onboarding.repository.ts`'s `resubmit`); the center step's
  `approved` decision (being last) flips the request to `approved` and
  inserts two placeholder document rows.
- Extended `server/src/modules/academic/`: `setProgramChair` (university_admin
  only, target must be an active advisor there) and `setAcademicRecord`
  (coordinator/university_admin only, target must be an active student
  there).
- Extended `server/src/modules/placements/`: `createPlacementFromRequest`,
  a sibling to the existing `createPlacement`, sourced from an `approved`
  request instead of an `accepted` application, and blocked
  (`REQUEST_COMPANY_NOT_RESOLVED`) until the company has actually joined
  the system (i.e. redeemed its Part A invite).

Endpoints (all behind `requireAuth`):

```
POST /api/v1/internship-requests
GET  /api/v1/internship-requests/me
GET  /api/v1/internship-requests/reviews
POST /api/v1/internship-requests/:requestId/steps/:step/review
POST /api/v1/internship-requests/:requestId/resubmit
POST /api/v1/internship-requests/:requestId/cancel
PATCH /api/v1/academic/majors/:majorId/program-chair
PUT   /api/v1/academic/:organizationId/students/:studentUserId/record
POST  /api/v1/placements/from-request
```

## v1 scoping decisions (both explicitly called out in the plan beforehand)

- **Document generation is a stub.** The two `internship_request_document`
  rows are created with `type` and `generatedAt` only — no actual PDF
  content. Generating and attaching real file bytes needs a templating
  engine, which hasn't been chosen yet; that's a follow-up ticket.
- **No "claim an unassigned program chair" flow.** `createRequest` rejects
  outright (`PROGRAM_CHAIR_NOT_ASSIGNED`) if the student's major has no
  program chair set yet. A university_admin must assign one first via the
  new endpoint.

## Verification

- `bun run type-check`, `bun run lint`, `bun run test`, `bun run build` —
  all green at the repo root. 144 server tests pass (23 new: 15 for
  `InternshipRequestService`, 8 for the new `AcademicService` methods), 45
  client tests pass (unaffected — this task is backend-only).
- Live: rebuilt the server Docker image and ran `docker compose up -d
--build`. Migration `0011` applied cleanly to the already-migrated local
  Postgres container — notably one that already had Part A's `invite`
  schema from a separate session, confirming the two parallel efforts
  don't collide. Confirmed all three new route groups
  (`internship-requests`, the academic program-chair endpoint, and
  `placements/from-request`) correctly return `401` with no session.

## Known limitations / next steps

- **No frontend at all for Part B** — per AGENTS.md rule 11 (backend
  before frontend), deliberately left for a follow-up pass.
- Document content generation (see above).
- No security-review pass yet on the review-step endpoints specifically —
  per the plan, this needs adversarial checks for reviewing a step out of
  order, reviewing as someone other than the assigned reviewer, and
  double-reviewing the same step, once there's a frontend to exercise it
  through and the feature is closer to complete (per the AGENTS.md
  self-pentest gate).
- `internshipRequest.companyOrganizationId` only gets populated once a
  company already exists or joins via a Part A invite — there's no
  UI/flow yet connecting "request approved with a proposed (not yet
  registered) company" to actually sending that company an invite. That
  hand-off is implicit in the data model but not automated.

## Commits

- `884d63d feat(internship-requests): add self-sourced internship request backend (Part B)`
  — local only, not pushed (per Git workflow rule 8).
