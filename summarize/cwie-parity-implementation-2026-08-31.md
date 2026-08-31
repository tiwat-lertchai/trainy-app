# CWIE parity implementation — 2026-08-31

## Outcome

Implemented the four approved gaps from the legacy CWIE comparison:

1. Internship track (`regular`/`cooperative`), semester (1–3), and Buddhist academic year now propagate from posting/application or self-arranged request into the placement.
2. Single-day leave requests are record-only workflow data with student create, participant/staff list, assigned advisor/supervisor review, duplicate/date/attendance conflict checks, and no attendance-hour mutation.
3. Check-in supports an off-site destination and mandatory reason while retaining existing explicit location evidence behavior.
4. A configurable evaluation engine resolves an active scheme by university and track, stores components/criteria/submissions/scores, enforces component evaluator authorization, keeps drafts private, locks submitted work, and computes the authoritative total and grade server-side.

## Form evidence and formula

The local official templates were treated as read-only sources. CWIE 14 defines supervisor 50, advisor 40, center head 5, and program committee 5, totaling 100. Its grade thresholds are A 80, B+ 75, B 70, C+ 65, C 60, D+ 55, D 50, and F below 50. The workplace-supervisor rubric contains ten criteria worth five points each. The advisor component remains the approved configurable 40-point placeholder until an authoritative detailed advisor rubric is confirmed. CWIE 17 and CWIE 18 are separate 100-point report rubrics and were not incorrectly merged into CWIE 14.

## Data and compatibility

- Migrations: `0012_lumpy_black_panther.sql`, `0013_aromatic_silver_surfer.sql`, `0014_slimy_mantis.sql`.
- Existing records are backfilled conservatively to regular track, semester 1, academic year 2569, then placement values are recovered from their application/request origin where available.
- The old three-score evaluation table and endpoints remain intact during client migration.
- Seed data creates separate versioned regular/cooperative schemes idempotently.

## Client coverage

- Company posting: track selection.
- Student listed application and self-arranged request: semester and academic year.
- Attendance: off-site destination/reason and record-only leave request/list UI.
- Existing legacy evaluation UI remains operational; the configurable rubric API is ready for a dedicated dynamic rubric screen.

## Verification

- Fresh PostgreSQL 17 Docker migration: passed.
- Seed executed twice without duplicates/errors: passed.
- Database integration and security suites: 40 passed.
- Server unit/API tests: 163 passed.
- Client tests: 52 passed.
- Type-check, ESLint, and client production build: passed.
- Production server/client Docker images built successfully; the Compose stack started healthy.
- Ephemeral Kali smoke checks passed for the web entrypoint, unauthenticated boundaries on the new leave/rubric endpoints, and the `nosniff` response header.
- Dependency audit: `bun audit` reported no vulnerabilities in 310 packages; `bun pm scan` was unavailable because no scanner is configured.
- Secret-pattern review found only expected test fixtures, schema field names, and environment-variable references; no production credential was introduced.

## Remaining follow-up

Build the dedicated dynamic rubric client screen and confirm whether the 40-point advisor component should be expanded into authoritative subcriteria. Add separate CWIE 17/18 report-rubric schemes only when the product workflow calls for those forms.
