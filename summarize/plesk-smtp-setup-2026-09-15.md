# Plesk SMTP Setup

## Scope

Prepared Trainy's local and Docker email configuration for the Plesk mailbox shown in
the approved setup reference. No password or other credential was added to Git.

## Configuration

- SMTP host: `tinysnowlion.com`
- SMTP port: `465`
- Transport security: implicit TLS (`SMTP_SECURE=true`)
- SMTP username: `trainy@tinysnowlion.com`
- Sender: `Trainy <trainy@tinysnowlion.com>`
- Password: intentionally left empty in the ignored local `.env` until supplied by the
  mailbox owner

The example sender value is now quoted so Plesk-style display names containing spaces
and angle brackets are parsed consistently by Bun and Docker Compose.

## Verification

- A TLS handshake to `tinysnowlion.com:465` succeeded with TLS 1.3 and certificate
  verification enabled.
- The server environment parser accepted the complete configuration when a temporary
  process-only password was supplied.
- Both `compose.yaml` and `compose.neon.yaml` passed configuration validation with a
  temporary process-only password.
- No message was sent and SMTP authentication was not attempted because the real
  mailbox password is not available.

## Required final step

Set `SMTP_PASSWORD` in the local/deployment secret store. Never add the password to a
tracked file, screenshot, issue, or chat message. After that, send one verification
email and one password-reset email to a controlled test mailbox and confirm delivery,
link expiry, and sender-domain SPF/DKIM/DMARC alignment.

## Commit

`chore(auth): prepare Plesk SMTP configuration`
