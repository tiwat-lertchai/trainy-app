# Student portal production alignment

## Scope

Aligned the existing student experience with the approved Trainy prototype and product requirements without replacing established backend workflows.

## Outcome

- Student desktop navigation now presents the five primary destinations: Overview, Requests, Internship, History, and Evaluations. Profile remains available from the account menu.
- The student dashboard counts listed-position applications and self-arranged internship requests together. Summary cards link to matching workflow destinations, and the organization wording is now presented as an affiliation.
- New, draft, resubmitted, and cancelled internship requests now use consequence-specific confirmation where the action changes workflow state. Saving a draft remains confirmation-free.
- Company contact labels now explicitly identify the workplace contact in Thai and English.
- The student profile now separates read-only sign-in account details, personal information, emergency contact information, and sensitive health information. Profile load failures provide a retry action.
- The application now self-hosts Noto Sans Thai Looped instead of Google Sans, including Thai and Latin subsets for weights 400, 500, 600, and 700.

## Changed areas

- `client/src/features/dashboard/app-dashboard.tsx`
- `client/src/features/dashboard/dashboard-data.ts`
- `client/src/features/dashboard/dashboard-data.test.ts`
- `client/src/features/applications/internship-request-panel.tsx`
- `client/src/features/student-profile/student-profile-page.tsx`
- `client/src/i18n/messages.ts`
- `client/src/index.css`
- `client/src/design-tokens.test.ts`
- `client/vite.config.ts`
- `client/package.json`
- `bun.lock`

## Dependency change

- Added `@fontsource/noto-sans-thai-looped` 5.3.0.
- Removed `@fontsource/google-sans` 5.3.1.
- No security vulnerabilities were reported for the resulting 312-package dependency set.

## Verification

`bun run verify:fast` passed completely:

- dependency audit: passed, no vulnerabilities reported;
- formatting check: passed;
- type checks: passed for client, server, and shared;
- lint: passed;
- tests: passed, including 73 client tests and 179 server tests;
- production builds: passed for client, server, and shared.

The client production build emitted local Noto Sans Thai Looped font assets for all configured weights and language subsets.

## Known limitations

- The current profile backend does not yet expose verified institutional fields such as student ID, faculty, major, English legal name, editable phone, or preferred contact method. The UI therefore shows only real account data and existing profile fields rather than placeholder values.
- The History route currently separates terminal internship requests. A complete immutable cross-module event timeline still requires a dedicated backend event contract.
- Upcoming student milestones remain limited by the dates exposed through current APIs.

## Commit information

Not committed separately because the working tree already contains related uncommitted changes in the same dashboard, request, translation, and generated-route files, plus pending security-sensitive work that has not completed the repository-required Docker/Kali verification.

## Suggested next steps

1. Add a server-owned student institutional profile contract and migration for verified registry fields.
2. Add an immutable student history event API covering requests, documents, internship activity, and evaluations.
3. Add milestone data to the student dashboard API rather than displaying fixture dates.
4. Run authenticated browser journey checks with representative student data.
