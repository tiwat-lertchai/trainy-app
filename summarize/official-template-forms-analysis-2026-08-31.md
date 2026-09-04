# Official internship document templates: content analysis

## Scope and outcome

The user added `templates/` (untracked, official Word/PDF forms from a
specific institution — Chandrakasem Rajabhat University, Faculty of
Science, `คณะวิทยาศาสตร์ มหาวิทยาลัยราชภัฏจันทรเกษม`) to the working tree.
This is a documentation-only extraction of the fillable PDF forms' text
content (via `pdftotext -layout`), done to answer open business-rule
questions raised in
`summarize/legacy-cwie-business-logic-gap-analysis-2026-08-31.md` with an
authoritative current source instead of inferring from the legacy system.
No application code or schema was changed.

Two parallel tracks exist in the templates: **Normal internship** (ฝ.1–ฝ.11)
and **CWIE / cooperative education** (CWIE 01–19). They have materially
different evaluation forms and different levels of process weight (CWIE
requires more artifacts: work plan, report outline, two separate report
evaluations).

## Evaluation formula — confirmed from official forms (Normal track)

`ฝ.4`, `ฝ.5`, `ฝ.6`, `ฝ.7` together define the exact grading scheme, and it
matches what the legacy CWIE gap analysis found by a different route:

| Form      | Evaluator                                                             | Points  |
| --------- | --------------------------------------------------------------------- | ------- |
| ฝ.5       | Workplace supervisor (`ผู้นิเทศประจำหน่วยงาน`)                        | 50      |
| ฝ.6       | University advisor (`อาจารย์นิเทศก์`)                                 | 40      |
| ฝ.4       | Center head, orientation attendance (`หัวหน้าศูนย์ฯ`)                 | 5       |
| ฝ.7       | Program committee, final summary (`กรรมการศูนย์ฯ` / `ประธานหลักสูตร`) | 5       |
| **Total** |                                                                       | **100** |

ฝ.5/ฝ.6 grading bands (identical on both forms): `80–100=A, 75–79=B+,
70–74=B, 65–69=C+, 60–64=C, 55–59=D+, 51–54=D, <50=F`.

ฝ.5 breaks its 50 points into two groups of 5 criteria each (work quality,
problem-solving, safety/equipment care, initiative, diligence — then
personality: dress, manners, interpersonal skill, punctuality, integrity),
5 points each. ฝ.6 breaks its 40 points into 4+4 criteria of 5 points each
(work quality, problem-solving, self-development, logbook quality; then the
same personality group minus one item).

**This confirms the previously-deferred decision's "later, with an
authoritative form" condition is now partially met** — this is a real,
current, institution-specific form, not a legacy-system guess. Per the
user's decision recorded in `chats/decisions.md`, Trainy's schema/UI is
**still not being changed now** — this is recorded for when that later
adjustment happens, not an instruction to implement it today.

## Evaluation formula — CWIE track (more granular, separate from Normal)

CWIE track evaluation is split across more artifacts and does not use the
same 50/40/5/5 split:

- `CWIE 14` (workplace supervisor evaluation of on-the-job performance):
  starts with "Work Achievement — 10 points" as its first criterion
  (full form not fully extracted; more criteria follow on later pages).
- `CWIE 17` (CWIE advisor evaluation of the student's written report):
  Acknowledgment/Abstract/Contents 10, Content/Analysis 30, Summary 30
  (continues on a second page, not captured here).
- `CWIE 18` (a second, more granular report rubric, also for the advisor):
  10 items — Contents 5, Introduction 10, Details 15, Methodology 15,
  Results 15, Problem/Suggestion 10, plus 4 more items not captured in this
  pass.

**Not fully extracted in this pass** — CWIE 14/17/18 continue past what was
read here. If/when the evaluation formula work is picked up, re-extract
these three forms in full (`pdftotext -layout`) before finalizing a CWIE
scoring schema, since the two tracks are not interchangeable.

## Semester/academic-year field — confirms user's decision

Every evaluation form (ฝ.4, ฝ.5, ฝ.6, ฝ.7) and `CWIE 08`/`CWIE 10` carries a
`ภาคเรียนที่.../ปีการศึกษา...` (term / academic year) field tied to the
placement period. This matches the user's decision (recorded below) to
capture semester/term at internship-request application time rather than
inventing a separate academic-calendar domain immediately.

## Supervision visit schedule — confirms user's understanding

`CWIE 08` (`แผนการออกนิเทศ`, "site visit plan") is filled out by the
**university-side advisor** (`อาจารย์นิเทศ`) listing which students they
will visit, at which company, on what date/time, for up to 3 visits per
student across the term (business rule visible on the form: "1 advisor : 10
students, 1 student : visited 3 times"). `CWIE 13` (`แบบบันทึกการนิเทศ`,
visit log) is signed by **both** the advisor and the workplace's on-site
supervisor (`ผู้นิเทศงานสถานประกอบการ`) at the actual visit. This confirms
the user's understanding: it's coordination between the university advisor
and the company-side supervisor, anchored to a specific placement, not a
new organizational role.

## Leave / off-site requests — no official form exists

Searched every Normal-track and CWIE-track form for a dedicated leave or
off-site-work request. **None exists in this template set.** The closest
adjacent form, `ฝ.11` (`ขอเปลี่ยนที่ฝึกงาน`), is a formal _change of
placement location_ request requiring advisor + program-chair sign-off —
a heavier, different workflow (closer to Trainy's existing internship
request revision flow) than a day-to-day leave or off-site note.

This is useful negative evidence: leave and off-site-work are apparently
handled informally between the student and their workplace supervisor at
this institution, not through university paperwork. This supports the
user's decision (below) to implement them as lightweight operational
features on the attendance/check-in flow rather than a new
document-generation workflow.

## User decisions recorded from this analysis (2026-08-31)

See `chats/decisions.md` for the authoritative record; summarized here for
`summarize/`'s English-only convention:

1. Capture semester/academic-year at internship-request application time
   (not a separate academic-calendar domain for now).
2. A leave-request feature should exist for students.
3. Off-site work should be captured as an addition to the existing
   check-in flow (a destination/reason field), not a separate approval
   document — consistent with there being no official form for it.
4. Evaluation formula/schema changes remain deferred (per the prior
   decision) — this document records the real numbers for when that work
   is picked up, it does not authorize implementing them now.

## Verification

Documentation-only task. No application code, dependency, or schema
change. `pdftotext` (poppler-utils, already on the host) was used to read
official Normal-track (`ฝ.4`–`ฝ.11`) and CWIE-track (`CWIE 08`–`CWIE 19`)
fillable PDFs under `templates/`.

## Known limitations

- Forms are specific to one institution (Chandrakasem Rajabhat University,
  Faculty of Science). Other universities using Trainy may use different
  forms/weights — any schema change should stay configurable per
  university, not hardcode this institution's numbers.
- CWIE 14/17/18 were not read past their first page/section in this pass.
- No `.doc`/`.docx` files in `templates/` were opened in this pass (only
  the `(กรอกข้อมูล)` fillable PDFs) — the Word versions may contain
  additional instructions not visible in the PDF layout extraction.

## Commit information

Not committed — `templates/` itself remains untracked per the existing
handoff note, and this summary is new, uncommitted documentation pending
the user's/next session's review.
