# Legacy CWIE Business Logic Gap Analysis

## Scope and outcome

Compared the current Trainy backend with the public legacy repository
`jeerasak1617/cwie-project-Backend` at commit
`a49995c3d8d9faaf6b566992a3528c74b932790b` (2026-04-19).

The comparison focused on business workflows, authorization boundaries,
validation, state transitions, and feature coverage. No application source code
was changed. Trainy's domain-based architecture and organization-scoped access
model should be retained. Several CWIE-specific workflows are not yet represented
in Trainy and need product decisions before implementation.

## Systems reviewed

Trainy:

- `server/src/db/schema/organization.ts`
- `server/src/db/schema/placement.ts`
- `server/src/db/schema/attendance.ts`
- `server/src/db/schema/progress.ts`
- `server/src/db/schema/evaluation.ts`
- `server/src/modules/internships/`
- `server/src/modules/internship-requests/`
- `server/src/modules/placements/`
- `server/src/modules/attendance/`
- `server/src/modules/progress/`
- `server/src/modules/documents/`
- `server/src/modules/evaluations/`
- `server/src/security.authenticated-idor.integration.ts`

Legacy CWIE:

- `app/core/security.py`
- `app/models/user.py`
- `app/routers/auth.py`
- `app/routers/student.py`
- `app/routers/advisor.py`
- `app/routers/supervisor.py`
- `app/routers/admin.py`
- `app/routers/master_data.py`

## Architecture and authorization decisions

Keep the Trainy model:

- Domain-oriented modules instead of role-oriented router files.
- Organization memberships instead of one global role and direct
  `company_id`/`department_id` fields on the user.
- Separate internship posting, application or self-arranged request, and
  placement records.
- Explicit workflow transitions and immutable terminal states.
- Resource-level authorization based on organization membership, placement
  participants, and assigned reviewers.
- Zod validation, database constraints, repository transactions, and explicit
  conflict handling.
- Cancellation as a terminal status that preserves records and audit history.

Do not copy these legacy patterns:

- Separate `student`, `advisor`, `supervisor`, and `admin` API implementations
  for operations that belong to the same domain.
- Authorization based only on a global role.
- Assignment by raw IDs without validating role, organization, or company.
- Hard deletion of attendance, reports, evaluations, and the internship when an
  internship is cancelled.
- Automatic assignment as a side effect of signing.
- Free-form dictionaries, query parameters, and client-calculated score totals
  without a typed server-side contract.

## Workflow comparison

### Internship entry and placement

Legacy CWIE lets a student create an internship directly and then allows an
advisor, supervisor, or admin to attach reviewers. It defines an
`InternshipRegistration` approval model, but no active router or service uses
that model.

Trainy supports two explicit paths:

1. Company posting -> student application -> company acceptance -> placement.
2. Self-arranged request -> advisor -> program chair -> CWIE center approval ->
   placement.

This is a stronger model and should remain. Trainy additionally requires both
an advisor and a supervisor before a pending placement can become active.

### Attendance

Legacy behavior:

- Check-in and check-out use server-local current time.
- Coordinates are optional evidence and are not checked against a work site.
- Worked hours are the raw difference between check-out and check-in.
- Breaks and schedule boundaries are not applied.
- Supervisors approve normal attendance individually or in a batch.
- Leave requests and off-site requests are separate workflows.

Trainy behavior:

- An active placement and a schedule for the current Bangkok weekday are
  required.
- Breaks, grace periods, late arrival, early departure, and net minutes are
  calculated server-side.
- Location can be disabled, optional, or required onsite, with geofence and GPS
  accuracy evidence.
- Students request time adjustments and assigned reviewers approve or reject
  the request.
- Database uniqueness prevents duplicate attendance for one placement/date.

Open decisions:

- Whether ordinary attendance must be approved before its hours count.
- Whether leave and off-site requests are required for the first release.
- How approved leave affects expected and completed hours.

### Progress and internship records

Legacy CWIE separates:

- Daily logs: activities, learning, problems, solutions, and hours.
- Internship plans: weekly tasks, planned/actual hours, completion percentage,
  and supervisor approval.
- Experiences: topics, learned skills, challenges, solutions, outcomes, and
  separate advisor/supervisor comments.
- Monthly summaries signed by the supervisor.

Trainy currently has one period-based progress report containing a summary and
hours, with draft, submitted, approved, and revision-requested states. This is
safer as a workflow, but it does not preserve all legacy data semantics.

Before extending the frontend, decide whether to:

- Expand progress reports with structured work plan, learning, problem, and
  solution fields; or
- Introduce separate plan, daily activity, and experience domains.

Do not encode all missing fields into one unstructured summary merely for
legacy compatibility.

### Evaluation

Legacy scoring is organized as:

- Supervisor evaluation: maximum 50 points.
- Advisor evaluation: maximum 40 points.
- Orientation and debriefing by admin: 5 points each.
- Conceptual final total: 100 points.

The legacy implementation accepts a JSON score object and a client-provided
total, so its validation and calculation should not be copied.

Trainy currently stores one advisor and one supervisor evaluation per placement
with technical, communication, and responsibility scores from 1 to 5. Submitted
evaluations are immutable. It has no center/admin component, orientation,
debriefing, weighting, final score, grade, or pass rule.

This is the highest-priority business-rule mismatch. Obtain an authoritative
evaluation form and formula before changing the schema or UI.

## Missing or materially different CWIE features

Product decisions are required for:

1. Academic semester/term and official internship date windows.
2. Evaluation criteria, weights, orientation/debriefing, final score, and pass
   rules.
3. Leave requests and their effect on attendance totals.
4. Off-site requests.
5. Supervision visit schedules and visit reports.
6. Internship plans and separate daily/experience records.
7. Monthly summaries and signatures.
8. Emergency contact or family data, including narrow privacy rules.
9. Province, district, and subdistrict master data if official forms require
   structured addresses.
10. Authorized dashboard task counts for advisors and supervisors.

Legacy model classes alone are not evidence of completed behavior. The legacy
repository defines document, document-signature, notification, audit-log,
monthly-summary, and internship-registration tables without corresponding
complete creation/use workflows.

## Security findings in the legacy implementation

Confirmed examples:

- Supervisor student-detail lookup loads an internship by ID without requiring
  `user_sup_id` ownership.
- Advisor and supervisor family endpoints load family details through an
  internship ID without verifying assignment.
- Supervisor `unsign-experience` loads an internship by ID without ownership or
  company checks.
- Admin assignment accepts advisor/supervisor IDs without verifying their role
  or organization.
- Admin cancellation hard-deletes the internship and all related operational
  history.

Trainy's service-level participant checks and authenticated cross-tenant IDOR
integration tests are deliberate improvements and must remain part of every new
CWIE workflow.

## Recommended implementation order

1. Confirm authoritative semester and evaluation requirements from official
   documents/templates.
2. Design the evaluation formula and server-owned calculation contract.
3. Decide the attendance approval model, then design leave and off-site state
   transitions around it.
4. Add supervision visits as an independent domain.
5. Resolve progress-report granularity before adding more frontend forms.
6. Add only the minimum personal/emergency data required, with explicit
   resource-level authorization and privacy tests.
7. Add authorized dashboard projections after underlying workflows exist.

## Dependency changes

None.

## Verification

- `python3 -m py_compile` was run for the legacy `student.py`, `supervisor.py`,
  `advisor.py`, `admin.py`, and `models/user.py`; it completed successfully.
- Relevant Trainy source, schema constraints, unit-test files, and authenticated
  IDOR integration tests were inspected.
- No Trainy runtime tests, type checks, lint checks, builds, or pentests were
  run because this task changed documentation only.

## Known limitations

- The analysis used the public legacy repository at the exact commit listed
  above; private branches or external requirements may differ.
- Database model presence was not treated as proof that a feature is complete.
- Evaluation and official document requirements still require confirmation from
  authoritative institutional material.

## Commit information

Not committed during this analysis task.

