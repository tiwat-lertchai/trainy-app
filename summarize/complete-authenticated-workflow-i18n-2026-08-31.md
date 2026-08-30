# Complete authenticated workflow internationalization

## Outcome

Completed Thai and English internationalization across the remaining authenticated Trainy workflows. Production feature source no longer contains embedded Thai user-interface copy outside the centralized message catalog.

## Scope

- Localized applications, self-arranged internship requests, internship browsing and company position management.
- Localized placements, attendance, progress reports, documents, evaluations, academic administration, onboarding, and company invitations.
- Replaced presentation-label helpers with typed `MessageKey` mappings where workflow statuses, roles, document types, evaluator types, and API errors require translation.
- Made feature dates and times follow the selected locale while retaining the Bangkok timezone for attendance records.
- Kept Thai as the default locale and preserved the existing English toggle and interpolation behavior.
- Updated presentation-rule tests to verify typed translation-key mappings and localized validation behavior.

## Verification

- `bun audit`: passed with no vulnerabilities.
- `bun run test`: passed (149 server tests and 50 client tests).
- `bun run type-check`: passed.
- `bun run lint`: passed.
- `bun run build`: passed.
- Targeted i18n and feature-rule tests: passed throughout implementation.
- Production Thai-copy scan outside `client/src/i18n/messages.ts`: no matches.
- Locale scan: authenticated feature date/time formatting is locale-aware; explicit locale mapping remains only in already-localized notification and onboarding-review components.
- Root format check is blocked by the user-owned untracked `reports/owasp-security-report-2026-08-31.md` and a pre-existing summary formatting issue. The files changed by this work were formatted and checked separately without modifying `reports/` or `templates/`.

## Security and integration relevance

This change affects frontend presentation and typed translation metadata only. It does not change API contracts, authorization, persistence, schemas, or dependencies. The full test run still covered the existing server adversarial/security suite; no additional database integration run was necessary.
