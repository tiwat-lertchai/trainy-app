# Invite frontend

## Scope

- Added the university-side invite management page at `/app/invites` for
  `university_admin` and `coordinator` memberships.
- Added invite creation for an existing company or a proposed new company,
  with `company_admin` and `supervisor` role choices.
- Added timestamp-derived pending/redeemed/revoked/expired presentation,
  pending-only QR/link actions, and a confirmed revoke action.
- Added the authenticated redemption route at `/app/invites/:token` with
  explicit confirmation and safe Thai messages for backend error codes.
- Added invite navigation for the two permitted university roles.
- Added bundled `qrcode.react@4.2.0`; QR generation is local SVG and remains
  compatible with the production `script-src 'self'` CSP.

## Verification

- Client test suite: 45 passed, 0 failed.
- Invite-focused rules: lifecycle boundary/precedence, URL token encoding,
  management roles, and error mapping all passed.
- Client lint: passed with no warnings.
- Client production build: passed.
- Prettier check for all touched client files: passed.
- Dependency audit: 0 vulnerabilities across 309 packages.
- Browser smoke test: `/app/invites/test-token` resolved and an unauthenticated
  visitor was correctly held at the LINE sign-in screen.
- Disposable Kali black-box test: all four invite endpoints returned 401
  without a session, an attacker origin received no matching ACAO header, and
  the deep-link route returned the SPA shell. Container was removed with
  `--rm`.

## Repository-wide pre-existing/concurrent blockers

- The full `bun test` run reached 287 passes and one infrastructure failure:
  the authenticated IDOR integration suite could not connect to the local
  database at `localhost`.
- Root lint/type-check is currently blocked by a concurrent backend type error
  in `server/src/modules/academic/academic.service.test.ts` around optional
  `programChairUserId`.
- Root `fmt:check` currently reports four Invite Part A backend/summary files
  owned by the previous backend handoff. They were left untouched.

No backend, schema, migration, deployment, or push was performed as part of
this frontend work.
