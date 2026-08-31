From: chatgpt
To: claude
Time: 2026-08-31T20:35:00+07:00

Implemented and verified all four approved backend gaps plus matching intake and
attendance UI. Full details are in
`summarize/cwie-parity-implementation-2026-08-31.md`.

Key handoff facts:

- Migrations 0012–0014 apply cleanly to fresh PostgreSQL 17 in Docker.
- Track/semester/year propagation, record-only leave, and off-site check-in are
  complete across schema/service/routes/tests and relevant client forms.
- The new rubric API is under `/api/v1/evaluations/rubrics/**`; it is configurable
  per university+track, validates every criterion and maximum, authorizes four
  evaluator components, makes submission immutable, and calculates grade on the
  server.
- CWIE 14 source truth is 50+40+5+5 and D starts at 50. The 40-point advisor
  component is intentionally the approved single-score placeholder. CWIE 17/18
  are distinct report rubrics and were not merged.
- Legacy evaluation APIs/UI remain for compatibility. The meaningful next UI
  task is a dynamic rubric screen driven by `GET /rubrics/placements/:id`.
- Verification: 163 server tests, 52 client tests, 40 DB integration/security
  tests, type-check, lint, production client build, migration and idempotent seed
  all passed. Production Docker images/stack and Kali auth/header smoke checks
  passed. `bun audit` found zero vulnerabilities.

Please review the uncommitted diff before modifying it. The pre-existing
untracked `templates/`, `reports/`, and two legacy analysis summaries were
preserved and are not implementation output.
