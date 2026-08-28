# Trainy API Reference

This document is the offline contract for the Trainy frontend. The source of
truth remains the Hono routes and Zod schemas under `server/src/modules`.

## Conventions

- Development base URL: `http://localhost:3000`
- API prefix: `/api/v1`
- Authentication: Better Auth session cookie. Start LINE Login through Better
  Auth; do not navigate directly to the callback URL.
- All business endpoints require authentication unless marked public.
- IDs in route parameters are UUIDs unless the field is explicitly a user ID.
- JSON request bodies are limited to 1 MiB.
- Dates are ISO 8601 strings and are stored with a timezone.
- Successful single-resource responses use `{ "data": { ... } }`.
- Successful list responses use `{ "data": [ ... ] }`.
- Create operations return HTTP `201`; reads and updates return `200`.

Expected error response:

```json
{
  "success": false,
  "error": {
    "code": "ORGANIZATION_ACCESS_REQUIRED",
    "message": "Required organization access was not found",
    "requestId": "request-id"
  }
}
```

Common status codes are `400` validation failure, `401` unauthenticated, `403`
insufficient role, `404` inaccessible or missing tenant record, `409` workflow
conflict, `413` oversized body, `422` invalid business value, and `500`
unexpected server failure.

## Roles

| Organization | Roles                                                   |
| ------------ | ------------------------------------------------------- |
| University   | `university_admin`, `coordinator`, `advisor`, `student` |
| Company      | `company_admin`, `supervisor`                           |

Suspended memberships never grant access. A cross-tenant resource may return
`404` instead of `403` to avoid revealing that the resource exists.

## System and authentication

| Method | Path                   | Access      | Purpose                          |
| ------ | ---------------------- | ----------- | -------------------------------- |
| GET    | `/`                    | Public      | API identity and status          |
| GET    | `/api/v1/health`       | Public      | Liveness probe                   |
| GET    | `/api/v1/health/ready` | Public      | Database readiness probe         |
| ALL    | `/api/auth/*`          | Better Auth | Session and LINE OAuth endpoints |

The frontend normally checks the current session with
`GET /api/auth/get-session`. Better Auth owns the remaining authentication
payloads and cookies.

## Organizations and memberships

Base path: `/api/v1/organizations`

| Method | Path                                     | Access                                           |
| ------ | ---------------------------------------- | ------------------------------------------------ |
| POST   | `/`                                      | Authenticated user; creator becomes tenant admin |
| GET    | `/`                                      | Organizations and active memberships for current user |
| GET    | `/:organizationId`                       | Active member of the tenant                      |
| GET    | `/:organizationId/members`               | Tenant admin                                     |
| POST   | `/:organizationId/members`               | Tenant admin                                     |
| PATCH  | `/:organizationId/members/:membershipId` | Tenant admin                                     |

Create an organization:

```json
{
  "type": "university",
  "name": "Example University",
  "slug": "example-university"
}
```

List response entries include both the organization and the caller's active
membership so the frontend can select the correct tenant-scoped role:

```json
{
  "organization": {
    "id": "uuid",
    "type": "university",
    "name": "Example University",
    "slug": "example-university",
    "status": "active"
  },
  "membership": {
    "id": "uuid",
    "organizationId": "uuid",
    "userId": "better-auth-user-id",
    "role": "student",
    "status": "active"
  }
}
```

Suspended memberships are omitted. The role is tenant-scoped and must not be
copied onto the global Better Auth user record.

Add a member:

```json
{ "userId": "better-auth-user-id", "role": "student" }
```

Update a membership:

```json
{ "role": "advisor", "status": "active" }
```

The last active organization admin cannot be demoted or suspended.

## First-time onboarding and approvals

Base path: `/api/v1/onboarding`

| Method | Path                            | Access |
| ------ | ------------------------------- | ------ |
| GET    | `/me`                           | Current authenticated user |
| GET    | `/organizations`                | Active universities and companies available for onboarding |
| POST   | `/`                             | User without a request, or correcting a `revision_requested` request |
| GET    | `/reviews`                      | CWIE platform staff or eligible tenant admin |
| POST   | `/:onboardingId/review`         | Eligible reviewer for the requested role |

Students select an active university and receive an active student membership
immediately. Privileged roles never self-activate:

| Requested role | Reviewer |
| -------------- | -------- |
| `advisor`, `coordinator` | Active `university_admin` in the selected university |
| `supervisor` | Active `company_admin` in the selected company |
| `university_admin` | Active CWIE platform staff |
| First `company_admin` and new company | Active CWIE platform staff |

Company approval requires `documentsVerified: true`. CWIE staff must verify the
submitted company registration evidence outside the API before approving. The
approval transaction creates the company, activates the first company admin,
and marks the request approved atomically.

When a reviewer chooses `revision_requested`, a note is required. The applicant
can correct the form and submit it again; reviewer identity and the old decision
are cleared while the same request ID is retained.

Example student request:

```json
{
  "requestedRole": "student",
  "targetOrganizationId": "uuid",
  "profile": {
    "fullName": "Student Name",
    "email": "student@example.ac.th",
    "phone": "0812345678",
    "studentId": "65000001",
    "faculty": "Engineering",
    "major": "Software Engineering",
    "yearLevel": "4"
  }
}
```

CWIE company approval:

```json
{
  "decision": "approved",
  "documentsVerified": true,
  "note": "Registration evidence verified by CWIE staff."
}
```

`platform_staff` is a system-level assignment, not an organization role. The
first CWIE reviewer must sign in once and then be provisioned directly by an
authorized database operator. There is intentionally no public endpoint for
self-assigning this privilege.

## Internships and applications

Base path: `/api/v1/internships`

| Method | Path                                         | Access                                                        |
| ------ | -------------------------------------------- | ------------------------------------------------------------- |
| GET    | `/`                                          | Authenticated; published internships only                     |
| POST   | `/companies/:organizationId`                 | Active `company_admin`                                        |
| GET    | `/companies/:organizationId`                 | Active company admin/supervisor                               |
| GET    | `/:internshipId`                             | Published, or active member of owning company                 |
| PATCH  | `/:internshipId`                             | Active `company_admin`                                        |
| POST   | `/:internshipId/applications`                | Active university `student`                                   |
| GET    | `/:internshipId/applications`                | Owning company admin/supervisor                               |
| GET    | `/applications/me`                           | Current student                                               |
| GET    | `/universities/:organizationId/applications` | University admin/coordinator/advisor                          |
| PATCH  | `/applications/:applicationId/status`        | Company reviewer; acceptance/rejection requires company admin |
| POST   | `/applications/:applicationId/withdraw`      | Application owner                                             |

Create an internship:

```json
{
  "title": "Backend Engineering Intern",
  "description": "Work with the backend team on maintained services.",
  "location": "Bangkok",
  "workMode": "hybrid",
  "capacity": 2,
  "applicationDeadline": "2027-01-31T16:59:59.000Z"
}
```

Update details or status:

```json
{ "status": "published" }
```

Internship states are `draft → published → closed`. Published content is
immutable; close it and create a replacement when material details change.

Apply:

```json
{
  "universityOrganizationId": "uuid",
  "statement": "At least twenty characters describing the application."
}
```

Application states are `submitted`, `under_review`, `accepted`, `rejected`, and
`withdrawn`. Terminal states cannot be reopened. Acceptance is serialized in a
database transaction so concurrent requests cannot exceed internship capacity.
Application list responses include the related internship and university.
Company and university staff views also include the student's basic account
name and email after role and tenant access checks succeed.

## Placements and assignments

Base path: `/api/v1/placements`

| Method | Path                             | Access                                                  |
| ------ | -------------------------------- | ------------------------------------------------------- |
| POST   | `/`                              | University admin/coordinator; accepted application only |
| GET    | `/me`                            | Current student                                         |
| GET    | `/organizations/:organizationId` | Active organization staff                               |
| PATCH  | `/:placementId/advisor`          | University admin/coordinator                            |
| PATCH  | `/:placementId/supervisor`       | Company admin                                           |
| PATCH  | `/:placementId/status`           | University admin/coordinator                            |

Create a placement:

```json
{
  "applicationId": "uuid",
  "startDate": "2027-03-01T00:00:00.000Z",
  "endDate": "2027-06-30T00:00:00.000Z"
}
```

Assignment bodies:

```json
{ "advisorUserId": "better-auth-user-id" }
```

```json
{ "supervisorUserId": "better-auth-user-id" }
```

Placement states are `pending → active → completed`, with `cancelled` available
from pending or active. Advisor and supervisor must both be assigned before
activation. Completed and cancelled placements are terminal.
Placement list responses include internship, student, advisor, and supervisor
display details after the relevant student or organization access check.

## Progress reports and logbooks

Base path: `/api/v1/progress-reports`

| Method | Path                       | Access                                  |
| ------ | -------------------------- | --------------------------------------- |
| POST   | `/`                        | Student owning an active placement      |
| GET    | `/placements/:placementId` | Student or assigned advisor/supervisor  |
| PATCH  | `/:reportId`               | Owner; draft or revision-requested only |
| POST   | `/:reportId/submit`        | Owner                                   |
| POST   | `/:reportId/review`        | Assigned advisor/supervisor             |

```json
{
  "placementId": "uuid",
  "periodStart": "2027-03-01T00:00:00.000Z",
  "periodEnd": "2027-03-07T23:59:59.000Z",
  "summary": "Completed assigned tasks and documented the results.",
  "hoursWorked": 40
}
```

Review with `{ "decision": "approved" }` or:

```json
{
  "decision": "revision_requested",
  "feedback": "Add measurable outcomes and supporting evidence."
}
```

States are `draft → submitted → approved`, or `submitted → revision_requested`
and back to draft after editing.

## Academic structure (faculties and majors)

Base path: `/api/v1/academic`

| Method | Path                              | Access                                  |
| ------ | ---------------------------------- | ---------------------------------------- |
| GET    | `/:organizationId/faculties`       | Any authenticated user (no membership required — used during onboarding) |
| POST   | `/:organizationId/faculties`       | University admin                         |
| GET    | `/faculties/:facultyId/majors`     | Any authenticated user                   |
| POST   | `/faculties/:facultyId/majors`     | University admin (of the faculty's university) |

Faculties and majors belong to a university organization. They power the
faculty/major dropdowns on the student and advisor onboarding forms and are
readable before the caller has a membership in that university, matching
`GET /api/v1/onboarding/organizations`.

```json
{ "name": "คณะวิทยาการจัดการ" }
```

Faculty and major names are unique per organization/faculty; creating a
duplicate returns `409`.

## Attendance and location evidence

Base path: `/api/v1/attendance`

| Method | Path                                  | Access                                     |
| ------ | -------------------------------------- | ------------------------------------------- |
| PUT    | `/:placementId/schedule`               | Company admin                               |
| GET    | `/:placementId/schedule`               | Student or assigned advisor/supervisor, or active company/university staff |
| POST   | `/:placementId/check-in`               | Placement student                           |
| POST   | `/:attendanceId/check-out`             | Placement student                           |
| GET    | `/:placementId`                        | Student or assigned advisor/supervisor, or active company/university staff |
| POST   | `/:attendanceId/adjustments`           | Placement student                           |
| GET    | `/:placementId/adjustments`            | Assigned advisor/supervisor                 |
| POST   | `/adjustments/:adjustmentId/review`    | Assigned advisor/supervisor                 |
| GET    | `/organizations/:organizationId/summary` | University admin/coordinator/advisor      |

Location is captured only when the student explicitly checks in or out;
continuous tracking is never performed. Timestamps always come from the
server; the API never accepts a client-supplied check-in/out time. The
initial supported timezone is `Asia/Bangkok`.

Set a weekly schedule:

```json
{
  "days": [
    { "weekday": 1, "startMinute": 480, "endMinute": 1020, "breakMinutes": 60, "graceMinutes": 10 }
  ],
  "timezone": "Asia/Bangkok",
  "locationPolicy": "required_onsite",
  "geofence": { "latitude": 13.75, "longitude": 100.5, "radiusMeters": 200 }
}
```

`locationPolicy` is `disabled`, `optional`, or `required_onsite`. A geofence
is required when `required_onsite` is selected.

Check in or out:

```json
{ "location": { "latitude": 13.75, "longitude": 100.5, "accuracyMeters": 8 } }
```

If GPS is unavailable and the schedule requires onsite location, send an
exception reason instead so attendance is never silently lost:

```json
{ "locationExceptionReason": "Company wifi disabled device GPS today." }
```

Sending both `location` and `locationExceptionReason` in the same request is
rejected. Attendance status is one of `checked_in`, `complete`, `late`,
`left_early`, `late_and_left_early`, or `incomplete`, derived from the
schedule's grace period and end time.

Request a time correction:

```json
{ "proposedCheckOutAt": "2027-03-01T10:00:00.000Z", "reason": "Forgot to check out after the on-site visit." }
```

Review it:

```json
{ "decision": "approved", "note": "Confirmed with the on-site supervisor." }
```

A placement has at most one pending adjustment request at a time. Approval
recalculates attendance status and net minutes from the corrected times.

## Placement documents

Base path: `/api/v1/documents`

| Method | Path                       | Access                       |
| ------ | -------------------------- | ---------------------------- |
| POST   | `/`                        | Placement student            |
| GET    | `/placements/:placementId` | Student or assigned reviewer |
| GET    | `/:documentId/download`    | Student or assigned reviewer |
| POST   | `/:documentId/review`      | Assigned advisor/supervisor  |

Upload as `multipart/form-data` with these fields:

```text
placementId: uuid
type: consent
file: consent.pdf
```

Allowed MIME types are PDF, JPEG, and PNG. Maximum size is 20 MiB. Document
types are `resume`, `consent`, `progress_evidence`, `final_report`, and `other`.
Review decisions are `approved` or `rejected`; rejection requires feedback.
Files are private runtime data under `UPLOAD_DIR` (default `uploads`) and are
only returned through the authenticated download endpoint. The uploads folder
must be mounted on persistent storage in production and included in backups.

## Evaluations

Base path: `/api/v1/evaluations`

| Method | Path                       | Access                         |
| ------ | -------------------------- | ------------------------------ |
| POST   | `/`                        | Assigned advisor or supervisor |
| GET    | `/placements/:placementId` | Placement participant          |
| POST   | `/:evaluationId/submit`    | Evaluation owner               |

```json
{
  "placementId": "uuid",
  "technicalScore": 4,
  "communicationScore": 5,
  "responsibilityScore": 4,
  "comment": "Strong performance throughout the internship."
}
```

Scores are integers from 1 to 5. Each placement has at most one advisor and one
supervisor evaluation. Submitted evaluations are immutable. Students only see
submitted evaluations.

## Notifications

Base path: `/api/v1/notifications`

| Method | Path                    | Access                           |
| ------ | ----------------------- | -------------------------------- |
| GET    | `/`                     | Current user; newest 100 records |
| POST   | `/:notificationId/read` | Notification owner               |

Workflow reviews create in-app notifications. Notification delivery failures
are logged without changing the already-committed domain result.

## Reports and audit

| Method | Path                                            | Access              |
| ------ | ----------------------------------------------- | ------------------- |
| GET    | `/api/v1/reports/organizations/:organizationId` | Active tenant admin |

The report contains active member count plus application and placement counts
grouped by status. Company reports also contain internship count.

Authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests under `/api/v1` are
recorded as append-only audit events with actor, method/path, entity hint,
request ID, response status, and timestamp. Audit records do not have a public
API endpoint; query access should be added only with a dedicated compliance
policy.

## Frontend implementation notes

- Always send cookies with `credentials: "include"`.
- Treat `401` as signed out and `403` as insufficient role.
- Display `error.requestId` in support messages.
- Do not infer permissions from hidden buttons; the backend remains authoritative.
- Refetch notifications and the affected workflow after each mutation.
- Never place LINE secrets, Better Auth secrets, or Neon credentials in Vite
  environment variables.
