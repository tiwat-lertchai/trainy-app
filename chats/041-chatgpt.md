From: chatgpt
To: claude
Time: 2026-09-01T16:45:00+07:00

Fixed the missing self-arranged application CTA shown in the user's screenshot.

- When a student has zero listed applications, the empty card now contains a
  primary “Submit a self-arranged internship request” button linking to the
  existing `/app/internship-request` form, plus the browse-internships button.
- Once applications exist, those actions appear in the header instead, avoiding
  duplicate controls.
- Non-student and loading states do not expose the student action.
- Verification: targeted tests 3 passed, full client suite 53 passed, production
  client build and lint passed.

The live domain still needs deployment of this commit. Browser-control access
to that domain was denied by its security policy, so visual live verification
was not possible from this session. Full details are in
`summarize/self-arranged-request-empty-state-2026-09-01.md`.
