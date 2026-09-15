# Email and Password Authentication

## Scope

Added verified email/password accounts alongside the existing LINE login, with
password recovery, layered abuse limits, SMTP delivery, and dedicated public client
routes. Also moved the landing-page navigation links into the right-side action group
as requested.

## Security decisions

- Email/password accounts require mailbox verification before sign-in.
- Passwords must contain 12–128 characters and continue to use Better Auth's maintained
  password hashing implementation.
- Password reset links expire after 30 minutes and resetting revokes existing sessions.
- Better Auth limits email sign-in to 5 attempts per IP per minute, sign-up and reset
  requests to 3 per IP per 5 minutes, and reset submissions to 5 per IP per 5 minutes.
- The existing Hono authentication limiter remains as an additional 20-request/minute
  perimeter control.
- Reset requests return the same generic response for existing and unknown accounts.
- Redirect destinations remain restricted by Better Auth's trusted-origin validation.
- SMTP uses authenticated transport, bounded connection/socket timeouts, and requires
  TLS for STARTTLS configurations. Delivery failures never log recipients, tokens,
  links, credentials, or provider error details.
- Auth-specific rate-limit storage is in memory, matching the existing single-process
  deployment. Move it to shared/database storage before horizontally scaling servers.

## Files and systems

- `server/src/modules/auth/auth.ts`: email/password, verification, reset, and endpoint
  limits.
- `server/src/lib/auth-email.ts`: SMTP delivery boundary.
- `server/src/config/env.ts`: required SMTP configuration.
- `client/src/routes/auth.tsx`: LINE, email sign-in, account creation, and forgot-password
  UI.
- `client/src/routes/reset-password.tsx`: one-time password reset UI.
- `compose.yaml`, `compose.neon.yaml`, and `.env.example`: SMTP deployment contract.
- `README.md` and `server/README.md`: authentication and secret-handling documentation.

## Dependency decision

Added `nodemailer@10.0.9` and `@types/nodemailer@8.0.1`. Nodemailer was selected over a
custom SMTP implementation because SMTP negotiation, STARTTLS, authentication, and
timeouts are mature protocol concerns that should not be reimplemented locally. No
client dependency or bundle dependency was added. `bun audit` found no known
vulnerabilities across 312 packages.

## Verification

- `bun run verify:fast`: passed audit, formatting, type checks, lint, 64 client tests,
  175 server tests, and all production builds.
- Live browser inspection: `/auth` rendered the LINE and email flows correctly.
- Disposable Kali container, `--network host`:
  - short password sign-up returned `400 PASSWORD_TOO_SHORT`;
  - an external reset redirect returned `403 INVALID_REDIRECT_URL`;
  - five invalid email sign-ins returned `401`, and attempt six returned `429`;
  - the last rate-limit response exposed no account or internal details.
- A reset request for an unknown address returned the generic `200` response expected
  for enumeration resistance.
- The Kali container used `--rm` and was removed after the test.

## Environment and limitations

Real SMTP delivery was not exercised because no SMTP credentials are present in the
workspace environment. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, and `SMTP_FROM`, then test delivery and sender-domain authentication
(SPF, DKIM, and DMARC) against the real mail server before production rollout.

## Suggested next steps

1. Add the real SMTP values to the deployment secret store, never to Git.
2. Exercise verification and password-reset delivery with a test mailbox.
3. Move Better Auth rate-limit state to shared storage before running multiple server
   replicas.

## Commit

`feat(auth): add verified email password recovery`
