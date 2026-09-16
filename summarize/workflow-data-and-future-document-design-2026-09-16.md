# Workflow, data, and future document design

## Scope

Added reviewed design documentation for the remaining Trainy research-release
workflow and the intentionally deferred official-document automation work. No
runtime code, database schema, migration, API, template, or production data was
changed.

## Files changed

- `docs/product-design/README.md`: design index and release boundary.
- `docs/product-design/current-release-workflow-data-design.md`: role journeys,
  state machines, ER model, data changes, authorization, migration slices,
  verification, and completion criteria.
- `docs/product-design/future-document-automation.md`: future template registry,
  field mapping, generation, numbering, signing, printing, and security design.
- `summarize/workflow-data-and-future-document-design-2026-09-16.md`: this task
  record.

## Decisions

- Files currently under `templates/` are treated as the latest available
  institutional forms for the present release.
- Automatic form population, official numbering, signing, preview, and printing
  are deferred to a later release.
- The present release uses download, external completion/signing, versioned
  upload, review, and history.
- The existing Trainy domains are extended instead of replaced.
- Sensitive fields present in official forms are not automatically added to the
  application data model.
- Security audit events remain separate from the user-visible placement timeline.

## Dependency changes

None.

## Verification

- Documentation was compared with the current Drizzle schemas, product
  requirements, revision draft, official-template analysis, and recent workflow
  summaries.
- `git diff --check` was run for the new documentation.
- No automated runtime tests were required because executable behavior did not
  change.

## Known limitations

- Five policy decisions remain open: concurrent request limits, workplace
  address structure, supervisor document visibility, retention periods, and
  supervision visit requirements.
- Exact CWIE scoring configuration must be completed from the full official
  rubrics before implementation.
- Database and API names remain proposals until the design is approved for
  implementation.

## Commit information

Not committed at the time this summary was created.

## Suggested next step

Review the current-release design and resolve the open policy decisions, then
implement Slice 1 as an additive, backend-first change.
