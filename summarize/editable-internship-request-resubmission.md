# Editable internship-request resubmission

## Scope and outcome

- Completed the revision workflow for self-sourced internship requests.
- A student whose request is `revision_requested` can edit the position,
  description, proposed dates, and permitted company/contact fields before
  resubmitting.
- The API now requires and validates the complete editable body. Immutable
  workflow fields (request type, academic major, advisor, and reviewer
  assignments) are not accepted by the resubmit contract.
- Resubmission updates the request and resets every approval decision
  atomically. The assigned advisor and program chair are retained; the center
  step becomes unclaimed again.

## Files and systems changed

- `server/src/modules/internship-requests/internship-request.schema.ts`
- `server/src/modules/internship-requests/internship-request.route.ts`
- `server/src/modules/internship-requests/internship-request.service.ts`
- `server/src/modules/internship-requests/internship-request.repository.ts`
- `server/src/modules/internship-requests/internship-request.service.test.ts`
- `server/src/modules/internship-requests/internship-request.repository.integration.ts`
- `client/src/features/applications/internship-request-panel.tsx`
- `server/docs/api-reference.md`
- `server/package.json`

## Important decisions

- Only mutable request content can change during resubmission. Academic and
  reviewer routing remains stable so a student cannot redirect an existing
  approval chain.
- Company input must resolve to exactly one source: an active company already
  in Trainy, or a proposed company with complete contact details.
- The service verifies ownership and revisable state before resolving a changed
  company, avoiding an organization-status lookup oracle on closed requests.
- Repository updates explicitly clear company fields from the unused source to
  prevent a request from retaining conflicting registered/proposed company data.

## Dependencies

- No dependency or lockfile changes.
- `bun audit` checked 310 packages and found no vulnerabilities.
- `bun pm scan` was unavailable because no Bun security scanner is configured;
  the repository's established `bun audit` check was used instead.

## Verification

- Targeted internship-request service/schema tests: 20 passed.
- Root unit tests: 149 server tests and 49 client tests passed.
- PostgreSQL integration suite: 40 tests passed, including the new real
  transaction resubmission test; the new test also passed twice consecutively.
- `bun run type-check`: passed.
- `bun run lint`: passed.
- `bun run fmt:check`: passed.
- `bun run build`: passed.
- `git diff --check`: passed.
- Production Compose images built and the client, server, and database became
  healthy.
- OWASP-aligned black-box checks from a disposable Kali container confirmed:
  anonymous and path-abuse resubmit requests returned `401`, an untrusted origin
  received no `Access-Control-Allow-Origin`, a body over 1 MiB returned `413`,
  and the existing CSP, permissions, frame, content-type, and referrer headers
  remained present. The Kali container was removed and the test database was
  stopped afterward.

## Known limitations

- The edit/resubmit UI has not been exercised with a real LINE-authenticated
  student and reviewer account.
- The UI currently preserves an already-resolved company rather than offering a
  company picker; proposed-company contact details remain editable.

## Commit information

- Intended local commit: `feat(internship-requests): support editable resubmission`.
- No push requested or performed.

## Suggested next steps

- Define the official document-generation rules using the newly supplied
  institutional templates.
- Automate proposed-company invitation and request association.
- Continue authenticated Thai/English feature-page coverage.
