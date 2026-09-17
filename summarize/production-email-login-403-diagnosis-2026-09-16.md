# Production email login 403 diagnosis

## Scope

Investigated the reported HTTP 403 response when signing in with email and password at `https://trainy.snowy.page` without using or requesting a real user password.

## Evidence

- `GET /api/auth/get-session` returned HTTP 200 and included `Access-Control-Allow-Origin: https://trainy.snowy.page`.
- `POST /api/auth/sign-in/email` from the production origin with a nonexistent diagnostic identity and the production callback URL returned HTTP 401 `INVALID_EMAIL_OR_PASSWORD`.
- The same request with a relative `/app` callback also returned the expected HTTP 401.
- These checks demonstrate that the production origin, same-origin API proxy, and callback validation accept the deployed web origin for email sign-in.
- The installed Better Auth 1.7.2 email sign-in implementation returns HTTP 403 `EMAIL_NOT_VERIFIED` after valid password verification when `requireEmailVerification` is enabled and the user record is not verified.
- Trainy enables `requireEmailVerification: true` and `sendOnSignIn: true`. An unverified sign-in therefore attempts to queue another verification email and then intentionally returns 403.

## Diagnosis

The reported 403 is most consistent with a valid email/password account whose email has not yet been verified. It is not consistent with the production CORS or trusted-origin failure previously found in the LINE Login flow.

If no verification message arrives, the remaining likely fault boundary is SMTP delivery or mailbox filtering. The public API response cannot prove successful delivery because email is queued in the background and delivery failures intentionally omit recipient and token details from application responses and logs.

## Recommended checks

1. Inspect the exact response body in the browser network panel. `EMAIL_NOT_VERIFIED` confirms this diagnosis.
2. Check inbox, spam, and quarantine for the verification message generated on the latest sign-in attempt.
3. Inspect production server logs for the sanitized authentication-email delivery failure event.
4. Verify the deployed SMTP secret and sender-domain SPF, DKIM, and DMARC configuration without copying credentials into source, chat, or screenshots.
5. Add an explicit resend-verification action and clearer UI state if users cannot reliably recover from this condition.

## Changes and verification

No authentication, authorization, deployment configuration, database data, or dependency was changed. The investigation used one nonexistent diagnostic identity and did not create an account.

## Commit

No commit was created because this was a read-only diagnosis.
