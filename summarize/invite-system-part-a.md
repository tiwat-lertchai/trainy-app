# Company/mentor invite backend (Part A of self-sourced internship flow)

## Scope

First implementation slice of the plan at
`/home/tiwat/.claude/plans/wondrous-imagining-harbor.md`. That plan covers
two parallel additions to the internship placement model:

- **Part A (this task): company/mentor invites** — a university-side
  `university_admin`/`coordinator` generates a time-limited QR/link so a
  company that never signed up on its own can join with a pre-approved
  role, instead of going through the existing self-serve
  `onboardingRequest` review queue.
- **Part B (not started): self-sourced internship request** — the student
  finds their own company, gets advisor → program chair → center approvals,
  the center checks GPA and generates two official documents, and the
  request converges into the existing `placement` table alongside the
  job-board path. See the plan file for the full design (new
  `internshipRequest`/`internshipRequestApproval`/`internshipRequestDocument`
  tables, `academicMajor.programChairUserId`, `placement.applicationId`
  becoming nullable with a new nullable `placement.requestId`).

Both were scoped in Plan mode with the user before writing code; the
two-parallel-paths decision (rather than replacing the job-board flow) was
confirmed via AskUserQuestion.

## What was built (Part A only)

- `server/src/db/schema/invite.ts` — new `organization_invite` table.
  `token` (not the row id) is the credential in the QR/link — high-entropy,
  `crypto.randomBytes(32).toString("base64url")`. CHECK constraint enforces
  exactly one of `target_organization_id` / `proposed_organization_name`
  (invite into an existing company vs. bootstrap a brand-new one). Migration
  `server/drizzle/0010_burly_stranger.sql`.
- `server/src/modules/invites/` — new module (schema/repository/service/route),
  built to mirror `server/src/modules/onboarding/`'s shape exactly, since
  that module already had the closest analogous pattern (multi-step review
  with role-scoped access, and "organization doesn't exist yet" bootstrap
  via `onboardingRequest.proposedOrganization`).
- Wired into `server/src/app.ts` at `/api/v1/invites`. All four endpoints
  sit behind `requireAuth` — no unauthenticated business routes, consistent
  with the posture from `summarize/localhost-pentest-owasp.md`:
  - `POST /api/v1/invites` — create (university_admin/coordinator only)
  - `GET /api/v1/invites/organization/:organizationId` — list
  - `DELETE /api/v1/invites/:inviteId` — revoke
  - `POST /api/v1/invites/:token/redeem` — redeem into the caller's account

## Rules enforced

- Only `university_admin`/`coordinator` of the inviter's own university can
  create/list/revoke invites for that university (same `requireMembership`
  pattern as `placement.service.ts`).
- A `targetOrganizationId` must reference an active `company`-type org.
- Redeeming checks, in order: invite exists → not revoked → not already
  redeemed → not expired → redeemer doesn't already have a membership in the
  target org (mirrors onboarding's `MEMBERSHIP_CONFLICT`).
- Invites default to a 14-day lifetime (matches what the user described).

## Verification

- `bun run type-check`, `bun run lint`, `bun run test` (121 server + 40
  client tests pass, including 9 new `InviteService` tests: create,
  role-forbidden, bad target org, redeem grants membership, and rejection
  of expired/already-redeemed/revoked/conflicting redemption), `bun run
build` — all green at the repo root.
- Live: rebuilt the server Docker image, applied migration `0010` to the
  already-migrated local Postgres container with no errors, confirmed all
  four invite routes return `401` with no session (auth wiring correct).

## Known limitations / next steps

- **Frontend not built** — no UI to create an invite, render it as a QR
  code, or redeem one. Per AGENTS.md rule 11 (backend before frontend),
  this was deliberately left for a follow-up pass.
- **QR rendering library** not chosen yet — deferred in the plan as a small
  implementation detail, not an architecture decision.
- Part B (the much larger internship-request/approval-chain/document piece)
  has not been started at all.
- No dedicated security-review pass yet on the redeem endpoint specifically
  — the plan flags it as needing adversarial checks (token guessability,
  expired/revoked/already-used redemption, granting a role the inviter
  isn't allowed to) once the invite feature is closer to complete (Part A +
  frontend), per the AGENTS.md self-pentest gate.

## Commits

- `48bfd0b feat(invites): add company/mentor invite backend (Part A of self-sourced internship flow)`
  — local only, not pushed (per Git workflow rule 8).
