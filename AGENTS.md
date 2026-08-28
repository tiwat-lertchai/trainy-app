# Trainy Project Instructions

These instructions apply to the entire Trainy monorepo.

## Code quality

1. Prioritize readability. Write code that other developers can understand,
   maintain, and extend. Keep files and responsibilities focused, and avoid
   unnecessary complexity.
2. Add English comments only where they provide useful context, especially for
   business rules, security constraints, or non-obvious implementation choices.
   Do not comment code whose behavior is already clear.

## Reporting and verification

3. At the end of every task, report exactly what changed, including the files or
   systems affected, the features added, and the resulting behavior.
4. Every function or feature must have relevant tests. Run those tests and the
   appropriate TypeScript checks, lint checks, and builds for each change.
5. Never claim that a test or check passed unless it was actually run. If a
   check cannot run because of a missing environment, database, credential, or
   tool, state that clearly and flag the unverified work.

## Git workflow

6. Commit only completed work that has passed all applicable verification.
   Automatic local commits are authorized after the work is complete and the
   verification results are satisfactory.
7. Write commit messages in English using Conventional Commits, for example:
   `feat(auth): configure LINE login`, `fix(server): validate trusted origins`,
   or `docs(api): document backend endpoint contract`.
8. Do not push automatically. Push only when the user explicitly asks.
9. Test experimental dependencies or new technology on a separate branch named
   like `dev-<experiment>`. Report the results before proceeding, and never
   merge the experiment into `master` automatically.

## Architecture and security

10. Treat security as a primary requirement. Pay particular attention to strict
    CORS and cross-site policies, cookies, authentication, tenant isolation,
    request limits, secret management, and light adversarial testing limited to
    systems running locally under our control.
11. Complete backend behavior, database workflows, security controls, and API
    documentation before building frontend features that depend on them. The
    frontend must integrate with the real backend contract.
12. Before any security-relevant change (auth, CORS, headers, tenant isolation,
    new endpoints, file/document handling, etc.) is considered shippable, run a
    self-penetration-test pass against the running local dev environment,
    OWASP-aligned and black-box, from a disposable Kali container on
    `--network host` (see `summarize/localhost-pentest-owasp.md` for the
    established pattern and tooling). This runs only after all other
    verification (tests, type checks, lint, build) already passes. Stop and
    remove the Kali container when the pass is done. If the pentest finds an
    exploitable issue, fix it, re-run the check that found it, and do not mark
    the work done or push it until it is clean. Keep committing completed,
    already-verified increments locally throughout this process (per rule 6)
    so work in progress is never lost, but never push while a self-pentest
    finding is still open.

## Clarification

13. Ask immediately when something appears unusual or a requirement is unclear,
    especially when guessing could affect the architecture, business rules, or
    data integrity.

## Library documentation

14. When a library or framework API is unclear, consult its current official
    documentation before implementing. Prefer documentation that matches the
    version installed in this repository, including official `llms.txt` or
    `llms-full.txt` files when available, followed by the official reference,
    changelog, source code, or type definitions as appropriate. Summarize the
    relevant guidance for the task and do not guess an API from memory when it
    can be verified.

## Dependency safety and compatibility

15. Before starting implementation, inspect the current dependency and lockfile
    state. Check for known vulnerabilities, incompatible versions, and peer
    dependency conflicts. Report any vulnerability found, including its
    severity, affected package, likely impact, and proposed remediation.
16. Update a dependency when an update is required for the task, resolves a
    relevant vulnerability, or is explicitly requested. Select the safest
    compatible version after reviewing official release notes and migration
    guidance. Do not perform unrelated dependency churn. Test major-version or
    experimental upgrades on a separate `dev-<experiment>` branch as required
    by the Git workflow above.
17. After any dependency or lockfile update, run the complete repository test
    suite plus all applicable type checks, lint checks, and production builds.
    Report every command and its actual result. If credentials, infrastructure,
    or another environmental requirement prevents a check, explicitly mark the
    update as not fully verified and do not claim that all checks passed.

## Project summaries

18. After each completed task, add an English-only Markdown summary under
    `summarize/`. Use a descriptive, stable filename and include the task scope,
    files or systems changed, important decisions, dependency changes,
    verification commands and results, known limitations, commit information,
    and suggested next steps. Never include secrets, credentials, or personal
    data.
19. Before starting follow-up work, read the relevant files in `summarize/` and
    use them as the project's concise working memory. Keep each summary factual
    and compact enough to reduce repeated repository investigation.
