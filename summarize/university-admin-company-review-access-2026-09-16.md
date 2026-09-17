# University administrator access to company onboarding reviews

## Outcome

Active `university_admin` members can now list and decide pending `company_admin` onboarding requests from the existing access-review page. The university administrator sidebar now exposes that page as **Access requests** (`ตรวจคำขอเข้าใช้งาน`).

Platform staff retain the same access. Users without either authorization remain unable to see or decide company onboarding requests, and requests for the `university_admin` role itself remain restricted to platform staff.

## Authorization boundary

- Authorization is enforced by the server, not only by navigation visibility.
- The reviewer must be platform staff or have at least one active `university_admin` organization membership.
- Company onboarding requests are global rather than tied to a university, so an authorized university administrator can review any pending company administrator request. This is an explicit product decision for urgent operational handling.
- Review records continue to capture the reviewer user ID.

## Changed areas

- Added an active-university-administrator repository lookup.
- Extended company onboarding review authorization.
- Added allow and deny service tests plus repository integration coverage.
- Added the access-review destination to university administrator navigation in Thai and English.

No dependencies or database schema were changed.

## Verification

Passed:

- `bun run type-check`
- `bun run lint`
- `bun run build`
- `bun run test` (all four workspace test tasks passed; client reported 71 passing tests)
- Focused onboarding, navigation, dashboard, and i18n tests (19 passing)
- `bun audit` (no vulnerabilities reported)
- `git diff --check`
- Local black-box fallback checks: unauthenticated list and mutation requests returned HTTP 401, and a hostile Origin received no CORS allow-origin header.

Unavailable in this environment:

- Repository integration test: the configured PostgreSQL test service on port 5433 refused the connection.
- Required Kali Docker OWASP black-box pass: Docker is not installed or available on this host.

## Delivery status

The implementation is intentionally left uncommitted because the repository requires the Kali Docker security pass before a security-sensitive change is considered shippable. Run the PostgreSQL integration test and Kali Docker checks in a Docker-capable environment before committing.
