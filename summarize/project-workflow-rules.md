# Project Workflow Rules

## Outcome

Added repository-wide contributor instructions covering readability, reporting,
testing, Git usage, security, backend-first delivery, official library
documentation, dependency safety, and durable task summaries.

## Files changed

- `AGENTS.md`: Added the Trainy development and verification rules.
- `summarize/README.md`: Defined the format and safety requirements for future
  task summaries.
- `summarize/project-workflow-rules.md`: Recorded this policy update.

## Dependency changes

None.

## Verification

- `git diff --check`: Passed.
- Automated tests were not required because this task changed documentation
  only and did not change executable behavior.

## Known limitations

Dependency auditing has not been run as part of this documentation-only task.
It is required before the next implementation task begins.

## Commit

Not committed at the time this summary was created.

## Next step

Audit the current dependency and lockfile state before beginning frontend
implementation.
