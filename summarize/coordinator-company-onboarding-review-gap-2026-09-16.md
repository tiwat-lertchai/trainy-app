# Coordinator company onboarding review gap

## Scope

Investigated why a university coordinator could not find incoming company onboarding requests in the deployed Trainy application.

## Evidence

- The deployed coordinator sidebar contains Overview, Applications, Placements, Attendance, Academic, Invites, and Reports. It does not contain Access requests.
- A separate Review requests link is present in the top header and opens `/app/reviews`.
- The deployed review page loads successfully for the coordinator but resolves to the empty state: no requests awaiting review.
- Client navigation grants `accessReviews` only to `university_admin`; `coordinator` does not receive that destination in its role navigation.
- Server authorization for a pending `company_admin` onboarding request permits only platform staff or a user with an active `university_admin` membership.
- `listReviews` filters unauthorized requests before returning them, so a coordinator receives an empty list rather than a 403 response.

## Root cause

The company request exists outside the coordinator's current authorization scope. The experience is additionally confusing because the review route is linked globally in the top header while the role-specific sidebar does not expose it. This makes the page appear available even though the backend intentionally returns no reviewable company requests for a coordinator.

## Product decision required

Choose one authorization policy before implementation:

1. Keep company onboarding approval restricted to platform staff and university administrators, remove or disable the global review link for coordinators, and explain who owns company approval.
2. Allow active university coordinators to review company onboarding requests, add Access requests to coordinator navigation, and enforce the expanded permission on the server with allow/deny and tenant-scope tests.

Because company onboarding requests are currently global rather than associated with a specific university, granting coordinator access under the current data model would allow an authorized coordinator to see every pending company request. A university relationship or routing rule is required if coordinators should see only relevant companies.

## Changes and verification

No role, authorization, data, or application code was changed. The deployed UI was inspected read-only, and the relevant client and server authorization paths were reviewed.

## Commit

No commit was created because this was a read-only diagnosis.
