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
| GET    | `/`                                      | Active memberships belonging to current user     |
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

Add a member:

```json
{ "userId": "better-auth-user-id", "role": "student" }
```

Update a membership:

```json
{ "role": "advisor", "status": "active" }
```

The last active organization admin cannot be demoted or suspended.

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

## Placement documents

Base path: `/api/v1/documents`

| Method | Path                       | Access                       |
| ------ | -------------------------- | ---------------------------- |
| POST   | `/`                        | Placement student            |
| GET    | `/placements/:placementId` | Student or assigned reviewer |
| POST   | `/:documentId/review`      | Assigned advisor/supervisor  |

The API stores metadata only. Upload the file to the configured object storage
first, then submit its opaque storage key:

```json
{
  "placementId": "uuid",
  "type": "consent",
  "fileName": "consent.pdf",
  "storageKey": "placements/uuid/opaque-file-key.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 102400
}
```

Allowed MIME types are PDF, JPEG, and PNG. Maximum size is 20 MiB. Document
types are `resume`, `consent`, `progress_evidence`, `final_report`, and `other`.
Review decisions are `approved` or `rejected`; rejection requires feedback.

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
