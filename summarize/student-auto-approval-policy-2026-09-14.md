# Student auto-approval policy clarification

## Scope and outcome

- Clarified the version 0.2 requirements so verified student registrations may
  be approved automatically.
- Kept manual approval mandatory for advisor, staff, workplace-supervisor, and
  administrative role requests.
- Updated the account state design, migration sequence, acceptance criterion,
  and delivery summary to reflect this exception.
- Confirmed the current onboarding service and client presentation already
  implement student-only auto-approval and have focused tests.

## Files changed

- `requirements.md`
- `server/docs/v0.2-domain-and-access-design.md`
- `summarize/v02-requirements-foundation-2026-09-14.md`

## Important decisions

- Auto-approval is allowed only after server-side email, student evidence, and
  active-university checks. Client-supplied role data alone grants no access.
- Automatic approval must eventually produce the same immutable audit evidence
  as a manual approval transition.

## Dependencies

- None.

## Verification

- Focused onboarding server and client tests.
- Repository formatting and diff checks.

## Known limitations

- The current service verifies the target university and request shape but does
  not yet implement the complete email-verification, authoritative student
  registry, provider-independent account-state, or transactional audit model.

## Commit information

- Planned local commit: `docs(auth): clarify student auto-approval policy`.
- No push requested or performed.
