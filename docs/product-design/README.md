# Trainy product design

This directory is the reviewed design boundary for the remaining Trainy work.
It separates the workflow and data foundation needed for the current research
release from document automation that is intentionally deferred.

## Current release

Read [current-release-workflow-data-design.md](current-release-workflow-data-design.md)
for the user journeys, state machines, proposed data model, authorization
boundaries, migration order, acceptance criteria, and delivery slices.

The current release must let each actor complete and verify the internship
workflow in Trainy. Official templates remain external files: users download
the current template, complete and sign it outside Trainy, upload it, and send
it through review. Trainy stores the file and its workflow history but does not
populate, number, sign, preview, or print official forms.

## Future release

Read [future-document-automation.md](future-document-automation.md) for the
deferred template registry, PDF field mapping, document generation, numbering,
signing, preview, and printing work.

## Decision status

- The forms currently under `templates/` are accepted as the latest available
  institutional source for this release.
- Normal internship and CWIE remain separate tracks where their requirements
  or evaluation schemes differ.
- Existing application, request, placement, attendance, progress, document,
  evaluation, notification, and audit capabilities must be extended rather
  than replaced.
- No database migration or production behavior is authorized by these design
  documents alone. Schema and API implementation begins only after design
  review.
