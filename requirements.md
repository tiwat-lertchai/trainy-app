# Trainy — Product Requirements

**Status:** Draft v0.2

**Last updated:** September 14, 2026
**Scope:** Authentication, registration, student internship portal, and advisor/teacher portal

## 1. Product Purpose

Trainy is a responsive web application for managing university internships. It must help each user immediately understand:

1. What is happening now.
2. What action they need to take next.
3. Who is responsible for the current step.
4. What deadlines or milestones are approaching.
5. Where to find past requests, documents, and decisions.

The product home page must be action-oriented rather than a generic analytics dashboard. Important actions and exceptions appear before secondary information.

## 2. Users and Roles

- **Student:** submits an internship request, maintains internship information, sends activity logs, and completes evaluations.
- **Advisor/Teacher:** reviews requests, monitors assigned students, follows up on risks, and completes evaluations.
- **Staff:** verifies registration requests, controls roles, processes official documents, and administers internship rounds.
- **Workplace Supervisor:** confirms workplace information and submits assigned evaluations.
- **System Administrator:** manages permissions, reference data, security policy, and system operation.

Selecting a role during registration is a request only. It must never grant access by itself. Staff or another trusted institutional source must approve the requested role.

## 3. Version 0.2 Scope

### 3.1 Included

- Sign-in and registration with Email/Password or LINE Login.
- Email verification, forgotten password, password reset, and password change.
- Role request and staff approval before access to protected portal features.
- First-use onboarding and privacy notice acknowledgement.
- Student action-oriented home, internship progress, requests, activity, history, evaluations, and profile.
- Advisor action-oriented home, approval queue, all-student directory, supervised-student categories, evaluations, and profile.
- In-app notifications.
- Responsive desktop and mobile browser layouts.
- Thai and English names and labels where required by institutional records.

### 3.2 Excluded from Version 0.2

- Full staff administration portal.
- Full workplace-supervisor portal.
- Google Login and other Google service integrations.
- LINE Official Account and Messaging API notifications.
- Real-time chat.
- Native iOS or Android applications.
- Digital signatures and payments.
- Automated synchronization with an institutional registry unless separately approved.

The identity model must remain provider-independent so Google Login may be added later without creating a second user record.

## 4. Experience and Navigation Principles

- Use **flat content with lightweight glass navigation**. Transparency or blur is limited to navigation and persistent controls.
- Use progressive disclosure: show the decision or action first and reveal supporting details on demand.
- Use package-tracking-style progress for processes with clear sequential stages.
- Do not use continuous or decorative animation. Respect `prefers-reduced-motion`.
- Desktop uses a left sidebar. Mobile uses bottom navigation and a profile button in the top-right area.
- Account actions such as Profile, Settings, Help, and Sign out belong in the account menu, not the primary mobile navigation.

### 4.1 Student Primary Navigation

1. Home
2. Requests
3. Internship
4. History
5. Evaluations

### 4.2 Advisor Primary Navigation

1. Home
2. Approvals
3. Students
4. Evaluations

## 5. Authentication, Registration, and Onboarding

- **AUTH-01:** The sign-in page must offer LINE Login and Email/Password without requiring a role selection first.
- **AUTH-02:** The LINE Login button must follow the official LINE Login button guidelines for logo, color, text, spacing, and interaction states.
- **AUTH-03:** Better Auth is the intended authentication layer. User identity must be stored separately from authentication accounts so one user can safely have multiple sign-in methods.
- **AUTH-04:** Email/Password registration must require email verification before the role request is submitted for approval.
- **AUTH-05:** The system must support forgotten password, one-time password-reset tokens, and authenticated password changes.
- **AUTH-06:** Passwords must be hashed by the authentication library and must never be stored, logged, or compared as plaintext.
- **AUTH-07:** LINE Login must use an OpenID Connect Authorization Code flow and validate `state`, `nonce`, redirect URI, and PKCE on the server.
- **AUTH-08:** The verified LINE subject/user ID is the external account identifier. A display name must never be used as an identifier.
- **AUTH-09:** The system must not assume LINE always returns an email address. A user must provide and verify a contact email when necessary.
- **AUTH-10:** A new applicant must request one type: Student, Advisor/Staff, or Workplace Supervisor.
- **AUTH-11:** Verification data changes by type: student ID for students, personnel ID for institutional personnel, and invitation code for workplace supervisors.
- **AUTH-12:** Required account states are `pending_email`, `pending_approval`, `active`, `rejected`, and `suspended`.
- **AUTH-13:** Any account that is not `active` may access only its account-status page and actions necessary to complete verification or resolve rejection.
- **AUTH-14:** Staff must be able to approve, reject with a reason, or suspend a registration request. Every transition must create an audit event.
- **AUTH-15:** On the first active sign-in, the user must see one readable onboarding page explaining required data use before completing their profile.
- **AUTH-16:** Policy version, timestamp, and user ID must be recorded. Optional consent must be separate from required processing acknowledgement.
- **AUTH-17:** Account linking must require authentication to the existing account or a secure recovery flow. Matching email alone is insufficient.
- **AUTH-18:** A user must not remove their final authentication method and must establish a backup method before unlinking LINE.
- **AUTH-19:** Error messages for sign-in and recovery must not disclose whether an account or email exists.

## 6. Student Portal Requirements

### 6.1 Home

- **STU-HOME-01:** Show the student name, academic term, and internship type.
- **STU-HOME-02:** Show the current internship process as sequential progress, for example Request Submitted → Advisor Approved → Documents in Progress → Ready to Start.
- **STU-HOME-03:** Show only actions currently required from the student, including due date and a direct action button.
- **STU-HOME-04:** When no action is required, clearly state that the student is waiting and identify the responsible person or process.
- **STU-HOME-05:** Show upcoming milestones in chronological order.

### 6.2 Internship Requests

- **STU-REQ-01:** Students must be able to view and edit workplace, position, period, and advisor information while a request is editable.
- **STU-REQ-02:** Required fields must be validated with errors displayed next to the relevant control.
- **STU-REQ-03:** Supported states must include Draft, Submitted, Waiting for Advisor, Waiting for Staff, Changes Required, Approved, and Cancelled.
- **STU-REQ-04:** Drafts may be saved without confirmation.
- **STU-REQ-05:** Formal submission must show a summary and request confirmation because it begins the approval process.
- **STU-REQ-06:** A locked request must explain why it cannot be edited and who is currently responsible.
- **STU-REQ-07:** Students must be able to download a copy of a submitted request.

### 6.3 Internship Activity

- **STU-ACT-01:** Show workplace, supervisor, location, work schedule, and work arrangement.
- **STU-ACT-02:** Students must be able to create, edit, save, and submit daily or weekly logs according to program policy.
- **STU-ACT-03:** Log states must include Draft, Submitted, Changes Required, and Approved.
- **STU-ACT-04:** Show attendance/workday totals, submitted-log count, remaining duration, and upcoming events.
- **STU-ACT-05:** Make the assigned advisor's permitted contact information available when help is needed.

### 6.4 History and Documents

- **STU-HIS-01:** Record important events such as submissions, changes, approvals, cancellations, and document issuance.
- **STU-HIS-02:** Sort history newest first and show date, time, category, description, and actor when permitted.
- **STU-HIS-03:** Allow filtering by Requests, Documents, Approvals, Internship, and Evaluations.
- **STU-HIS-04:** Documents must appear in the context of their related event rather than as an unrelated file dump.
- **STU-HIS-05:** Students must not edit or delete official history entries.

### 6.5 Evaluations

- **STU-EVAL-01:** Show required evaluations, due dates, state, and progress.
- **STU-EVAL-02:** Evaluations that are not yet open must be disabled and show their opening date.
- **STU-EVAL-03:** Students may save a draft and resume later.
- **STU-EVAL-04:** Final submission requires confirmation when the response cannot be edited afterward.
- **STU-EVAL-05:** Workplace-supervisor evaluation status may be shown, but scores and comments must follow university disclosure policy.

### 6.6 Student Profile

- **STU-PRO-01:** Separate read-only registry data from student-editable contact data.
- **STU-PRO-02:** Read-only data includes at least student ID, Thai and English name, faculty, and program.
- **STU-PRO-03:** Editable data includes at least contact email, phone number, current address, and preferred contact method.
- **STU-PRO-04:** Store emergency-contact name, relationship, phone number, and optional email.
- **STU-PRO-05:** Saving ordinary profile changes must not require a confirmation dialog; show success or actionable error feedback.
- **STU-PRO-06:** Warn before leaving only when unsaved changes would be lost.
- **STU-PRO-07:** If registry data is incorrect, show the responsible office and contact route.

## 7. Advisor/Teacher Portal Requirements

### 7.1 Advisor Home

- **ADV-HOME-01:** Show high-priority work first: pending approvals, students needing follow-up, and evaluations approaching their deadlines.
- **ADV-HOME-02:** Summary counts must link to their corresponding filtered list.
- **ADV-HOME-03:** The approval queue must be ordered by age or urgency and show how long each item has waited.
- **ADV-HOME-04:** Upcoming meetings and deadlines must be shown chronologically.
- **ADV-HOME-05:** The system may identify potential risks from recent activity, but must show the underlying reason rather than an unexplained score.

### 7.2 Approval Queue

- **ADV-APP-01:** Advisors must see only requests within their authorized responsibility.
- **ADV-APP-02:** Each row must identify the student, program, workplace, position, request type, state, and waiting time.
- **ADV-APP-03:** The review view must show all information and documents required to make a decision.
- **ADV-APP-04:** Advisors may approve or return a request for changes with a reason.
- **ADV-APP-05:** The system must show a decision summary before committing a consequential action.
- **ADV-APP-06:** A successful decision must update the request state, notify the student, and create an immutable audit event.
- **ADV-APP-07:** Repeated submission caused by retry or reconnection must not create duplicate decisions.

### 7.3 Student Directory and Supervision Categories

- **ADV-STU-01:** The Students page must begin with **All Students** in the advisor's authorized academic scope, not only students currently supervised by that advisor.
- **ADV-STU-02:** The page must provide selectable categories at minimum: All, Currently Supervised, Waiting to Start, Needs Follow-up, and Completed.
- **ADV-STU-03:** Category counts must match the result set and update when underlying data changes.
- **ADV-STU-04:** Search must work together with the selected category and support student name, student ID, and workplace name.
- **ADV-STU-05:** Advisors must be able to filter by internship state and academic term.
- **ADV-STU-06:** Each student row must show identity, workplace, current stage, latest meaningful activity, and an explicit attention state.
- **ADV-STU-07:** Opening a student must show a timeline, request status, internship activity, evaluations, and permitted contact details.
- **ADV-STU-08:** “Currently Supervised” means an active assignment to the signed-in advisor. It must not be inferred only from the student's internship status.
- **ADV-STU-09:** Completed students remain discoverable through history but must not appear as active workload.
- **ADV-STU-10:** Pagination or incremental loading must be used when the complete authorized result set is large. Filtering and search must apply to the full result set, not only loaded rows.

### 7.4 Advisor Evaluations

- **ADV-EVAL-01:** Show evaluation rounds, opening and closing dates, completion count, and outstanding students.
- **ADV-EVAL-02:** Advisors may save evaluation drafts and resume later.
- **ADV-EVAL-03:** Final submission requires confirmation when it cannot be edited afterward.
- **ADV-EVAL-04:** Evaluation access and score visibility must follow institutional policy and assignment scope.

### 7.5 Advisor Profile

- **ADV-PRO-01:** Advisor profile interaction should follow the same pattern as the student profile, while using personnel-specific fields.
- **ADV-PRO-02:** Read-only institutional data includes at least personnel ID, Thai and English name, faculty, department, and assigned role.
- **ADV-PRO-03:** Editable information includes academic title where policy permits, university email, phone number, office location, preferred contact method, and available contact hours.
- **ADV-PRO-04:** The interface must state which contact fields are visible to supervised students.
- **ADV-PRO-05:** Ordinary profile changes save without a confirmation dialog and show success or actionable error feedback.
- **ADV-PRO-06:** Warn before leaving only when unsaved changes would be lost.
- **ADV-PRO-07:** Institutional identity corrections must be handled by the responsible staff office, not silently overwritten by the advisor.

## 8. Notifications and Account Session

- **ACC-01:** The mobile interface must provide a profile button in the top-right area.
- **ACC-02:** The account menu must include Profile, Settings, Help, and Sign out.
- **ACC-03:** Sign out requires confirmation only when unsaved information or an important in-progress operation would be lost.
- **ACC-04:** When a session expires, saved drafts must remain available and the user should return to the previous context after signing in when safe.
- **NOT-01:** Notify users about new tasks, requested changes, approval results, new documents, risk follow-ups, and approaching deadlines.
- **NOT-02:** A notification must link directly to the related item.
- **NOT-03:** Users must be able to mark notifications as read.
- **NOT-04:** Unread counts must remain consistent between the notification icon and notification list.

## 9. Confirmation and Feedback Rules

### 9.1 No Confirmation Required

- Save ordinary profile information.
- Save a request or evaluation draft.
- Change a reversible filter or preference.

Show a non-blocking toast or inline status after saving.

### 9.2 Confirmation Required

- Formally submit a request.
- Submit a final evaluation that cannot be edited afterward.
- Approve or return an official request.
- Cancel a request.
- Delete a file or record.
- Leave a page with unsaved changes.

Confirmation text must describe the specific consequence. Action buttons must use explicit labels such as “Confirm and submit,” not generic wording such as “OK.” Use a centered dialog on desktop and a bottom sheet on mobile for ordinary confirmations.

## 10. Required Screen States

Every data-driven view must support:

- **Loading:** localized skeletons without unnecessarily blocking the entire page.
- **Empty:** explain why there is no content and what the user may do next.
- **Validation error:** show the error next to its field and focus the first invalid control.
- **Recoverable error:** explain the problem and offer retry.
- **Offline/connection lost:** preserve entered data and prevent accidental duplicate submission.
- **Unauthorized:** route to sign-in and return to the original safe destination afterward.
- **Forbidden:** explain lack of permission without revealing restricted data.
- **Success:** provide clear feedback without blocking continued work.
- **Read-only:** explain why editing is unavailable.

## 11. Data Ownership and Visibility

| Data                                | Owner/source                          | User-editable                     |
| ----------------------------------- | ------------------------------------- | --------------------------------- |
| User identity and account state     | System and authorized staff           | No                                |
| Authentication credentials/accounts | User and Better Auth                  | Through authentication flows only |
| Requested and approved roles        | Applicant, staff, or trusted registry | Request only; approval required   |
| Privacy acknowledgement             | System                                | No                                |
| Student institutional identity      | Student registry                      | No                                |
| Advisor institutional identity      | Personnel registry                    | No                                |
| Contact and emergency information   | Relevant user                         | Yes, subject to policy            |
| Internship request content          | Student and approval workflow         | While editable or returned        |
| Approval state and decision         | Authorized advisor/staff              | Authorized decision only          |
| Official documents                  | Authorized staff                      | No                                |
| Internship logs                     | Student and reviewers                 | According to state and role       |
| Evaluation content                  | Assigned evaluator                    | According to evaluation state     |
| Activity and audit history          | System                                | No                                |

An advisor may access a student only when the advisor's role and academic scope permit it. Access control must be enforced on the server, including list, search, export, and detail endpoints.

## 12. Non-functional Requirements

### 12.1 Performance

- Core flows must remain usable on devices with 4 GB RAM and ordinary mobile networks.
- Avoid continuous animation, large client-side libraries for simple effects, and glass effects on scrolling content cards.
- Use blur only on lightweight navigation or persistent controls and provide an opaque fallback.
- Secondary data must not block the primary action on a home page.
- Long student lists must be paginated or incrementally loaded with server-side filtering.
- Production performance budgets must be finalized after the application stack, API shape, and average dataset size are confirmed.

### 12.2 Responsive Layout

- Support mobile widths from 360 px and desktop layouts from 1024 px.
- The main layout must not produce horizontal scrolling at 200% text zoom.
- Primary touch targets should be approximately 44 × 44 px or larger.
- Tables or dense list rows must adapt into readable stacked content on small screens.

### 12.3 Accessibility

- All flows must be keyboard operable with a visible focus indicator.
- Color must not be the only means of communicating state.
- Form labels and errors must be programmatically associated with their fields.
- Dialogs must trap focus while open and return focus to their trigger when closed.
- Status updates must be exposed through an appropriate live region without excessive announcements.

### 12.4 Typography and Language

- Trainy must use **Noto Sans Thai Looped** as the primary font for Thai, English, numerals, forms, buttons, and navigation.
- A system sans-serif fallback must be specified.
- Production should self-host only the required font weights; recommended weights are 400, 500–600, and 700–800.
- The interface must be tested with Thai marks and vowels, Arabic and Thai numerals, and mixed Thai-English content.
- Institutional identity fields must support both Thai and English where the source record provides them.

### 12.5 Security and Privacy

- Authorization must be enforced on the server; hiding a client-side control is insufficient.
- Apply deny-by-default: new accounts receive no protected role until active and approved.
- Session cookies must be `HttpOnly`, `Secure` in production, and use an appropriate `SameSite` policy.
- Rate-limit sign-in, sign-up, password reset, email verification, callback, and approval-sensitive endpoints.
- Secrets and tokens must never be included in client bundles or inappropriate browser storage.
- Validate OpenID Connect issuer, audience, expiry, nonce, state, and authorization response on the server.
- Encrypt personal data in transit and protect it at rest according to university policy.
- Record audit events for submissions, cancellations, approvals, role changes, and changes to sensitive information.
- Test for approval bypass, client-side role manipulation, cross-user access, callback replay, insecure account linking, and duplicate consequential submissions.
- Retention periods, correction rights, deletion procedures, privacy notices, and lawful basis under Thailand's PDPA must be approved before production.

## 13. Version 0.2 Acceptance Criteria

1. Existing users can sign in with Email/Password or a securely linked LINE account.
2. A new applicant from either sign-in method enters the same role-request and approval flow.
3. Non-active accounts cannot access protected data, including through direct API calls.
4. Editing a requested role in a client request cannot grant additional permissions.
5. Authorized staff can approve or reject a registration request with actor and timestamp recorded.
6. Invalid or replayed LINE callbacks are rejected without creating a session.
7. Password-reset responses do not reveal account existence, and expired or used tokens cannot be reused.
8. First-time active users acknowledge the current privacy-policy version before completing additional profile data.
9. A student landing on Home can identify current progress, required action, and next milestone without opening another page.
10. A student receives field-specific feedback for invalid profile or request data without losing valid entered information.
11. Formal submission shows a consequence-specific confirmation and creates one history event when successful.
12. An advisor landing on Home can identify the oldest pending approval, students requiring follow-up, and the next evaluation deadline.
13. The advisor Students page defaults to all authorized students and can filter by Currently Supervised, Waiting to Start, Needs Follow-up, and Completed.
14. Student search and category filters operate together against the full authorized dataset.
15. Advisor profile data clearly separates read-only institutional identity from editable contact information.
16. All primary student and advisor flows work at 360 px width, with keyboard input, and at 200% text zoom.
17. Recoverable API failure preserves entered data and retry does not duplicate a request, approval, or evaluation.

## 14. Open Decisions

- Better Auth version, database adapter, current schema, and legacy password migration approach.
- Eligible email domains and whether institutional email is mandatory for each role.
- Evidence, service level, and authorized approver for each registration type.
- Student and personnel registry verification method and fallback when a registry is unavailable.
- Workplace-supervisor invitation format, expiry, and single-use behavior.
- LINE email scope versus mandatory manual contact-email verification.
- Account linking, unlinking, and recovery policy when access to LINE or email is lost.
- PDPA controller/processor responsibilities, retention periods, notice text, and optional consent.
- Definition of an advisor's authorized student scope beyond directly supervised students.
- Whether a student may have more than one active internship request.
- Daily versus weekly internship logs and the responsible reviewer.
- Evaluation results and comments that students may see.
- Required signatures and document issuance process.
- Production notification channels: in-app, email, LINE, or a combination.

## 15. Prototype Status

The current standalone prototypes are:

- `trainy-auth-prototype.html` — authentication, registration, role request, and onboarding concept.
- `trainy-dashboard-prototype.html` — student portal concept.
- `trainy-advisor-prototype.html` — advisor/teacher portal concept, including profile and categorized student directory.

These files validate information hierarchy, responsive navigation, and selected interactions only. They do not implement Better Auth, live LINE Login, backend persistence, file upload, production error handling, audit storage, or server-side authorization. They are UX references, not production implementations.

## 16. Recommended Next Work

1. Validate the requirements with at least one or two students, advisors, and staff members.
2. Define the state machines for registration, internship requests, logs, and evaluations.
3. Produce a role-permission matrix and data dictionary.
4. Confirm the meaning and data source of each advisor student category.
5. Convert acceptance criteria into an implementation and test backlog.
6. Review data retention, privacy notices, and approval authority before production development.
