# Trainy Multi-tenant Workspace Platform — Architecture & Product Design

**Status:** Proposed Target Architecture

**Version:** 1.0

**Updated:** 18 September 2026

**Audience:** Product, Design, Backend, Frontend, Security, Operations

**Current implementation baseline:** Drizzle schema and migration snapshot `server/drizzle/meta/0018_snapshot.json` (37 tables, documented 17 September 2026)

เอกสารนี้เป็น architecture/design reference สำหรับออกแบบ Trainy ใหม่จากระบบจัดการฝึกงานของมหาวิทยาลัยหนึ่งแห่ง ไปเป็น **multi-tenant Workspace platform** ที่บัญชีผู้ใช้หนึ่งบัญชีเข้าร่วมได้หลายองค์กร คล้าย Discord ใน interaction model แต่มีขอบเขตข้อมูล การตรวจสอบตัวตน สิทธิ์ และ audit ที่เข้มกว่า

ในเอกสารนี้ **Workspace** คือคำใน product/UX ส่วน schema ปัจจุบันใช้คำว่า `organization` อยู่แล้วและรองรับ `university`/`company` จึงเสนอให้คงชื่อตารางและ route เดิมในช่วง migration (`organization`, `organization_membership`, `/api/v1/organizations`) แล้วค่อยตัดสินใจเรื่อง rename ภายหลัง การเปลี่ยนคำใน UX ไม่จำเป็นต้องทำ destructive database rename

---

## 1. Executive summary

Trainy ใหม่ประกอบด้วยสองชั้นหลัก:

1. **Trainy Core** — จัดการ User, Personal Profile, Workspace, Membership, Member Type, Role, Permission, Invitation, Verification, Profile Grant/Consent, Module Enablement และ Audit
2. **Domain Modules** — ความสามารถเฉพาะงาน เช่น Internship, Documents, Forms, Evaluation และในอนาคตอาจมีโครงการสหกิจ การรับสมัคร หรือกิจกรรมอื่น

หลักการสำคัญ:

- `User` เป็นตัวตนระดับแพลตฟอร์ม ไม่สังกัด Workspace ใด Workspace หนึ่ง
- ผู้ใช้เข้าถึง Workspace ผ่าน `WorkspaceMembership`
- `MemberType` บอกว่า “บุคคลนี้เป็นใครในองค์กร” เช่น Student, Teacher, Staff, Employee
- `Role` บอกว่า “บุคคลนี้ทำอะไรได้” เช่น Internship Reviewer, Document Officer
- การเลือก Member Type หรือกรอก identifier เป็นเพียง **claim** จนกว่าจะผ่าน verification
- `PersonalProfile` แยกจาก `WorkspaceProfile`; Workspace เห็นข้อมูลส่วนตัวได้เฉพาะตาม purpose, scope และ `ProfileGrant`
- ทุก resource ของ tenant ต้องมี `workspace_id` หรือถูกผูกกับ aggregate ที่พิสูจน์ workspace ได้อย่างชัดเจน
- Internship ไม่ใช่แกนกลางของ identity/authorization อีกต่อไป แต่เป็น module ที่เรียกใช้ Trainy Core

ภาพรวมแนวคิด:

```text
Trainy Account (User)
├── Personal Profile
├── Authentication Accounts (Email/Password, LINE, ...)
└── Memberships
    ├── University A
    │   ├── Member Type: STUDENT
    │   ├── Roles: MEMBER, INTERNSHIP_PARTICIPANT
    │   ├── Workspace Profile: student ID, program, faculty
    │   └── Enabled Modules: Internship, Documents, Forms, Evaluation
    ├── Company B
    │   ├── Member Type: EMPLOYEE
    │   ├── Roles: WORKPLACE_SUPERVISOR
    │   └── Workspace Profile: employee ID, department
    └── Personal Workspace
        └── Role: OWNER
```

---

## 2. Problem statement

โครงสร้างเดิมผูก User, Role และข้อมูลเฉพาะมหาวิทยาลัยเข้ากับระบบฝึกงานโดยตรง ทำให้เกิดข้อจำกัด:

- บัญชีหนึ่งมีหลายสังกัดหรือหลายบทบาทได้ยาก
- Role ถูกใช้ปนกันระหว่าง “ประเภทบุคคล” และ “สิทธิ์ระบบ”
- ข้อมูลส่วนตัวระดับบัญชีกับข้อมูลทะเบียนระดับองค์กรไม่แยก ownership
- ข้อมูลฝึกงานกลายเป็นศูนย์กลางของระบบ ทำให้เพิ่ม domain ใหม่ยาก
- การเชิญ การตรวจสอบสมาชิก และการมอบสิทธิ์ไม่เป็นโมเดลเดียวกัน
- query ที่ขาด tenant scope อาจทำให้ข้อมูลข้ามองค์กรรั่วไหล

เป้าหมายของ redesign คือให้ Trainy รองรับหลายองค์กรและหลาย use case โดยยังนำ workflow ฝึกงานเดิมกลับมาใช้ได้มากที่สุด

### 2.1 Current implementation baseline

ระบบปัจจุบันไม่ได้เริ่มจากศูนย์ และมีฐาน multi-organization ที่ควร reuse:

- `organization` รองรับ `university` และ `company`, มี slug/status และมี route `/api/v1/organizations`
- `organization_membership` รองรับ User เดียวอยู่หลายองค์กร และ frontend มี organization switcher ที่ตรวจ active membership จาก server แล้ว
- `organization_membership.role` ปัจจุบันรวม persona กับ authorization ไว้ใน enum เดียว (`student`, `advisor`, `coordinator`, `university_admin`, `company_admin`, `supervisor`)
- `onboarding_request` จำกัดหนึ่ง current request ต่อ User และเก็บ `requested_role` กับ `profile_data` JSONB
- `organization_invite` ใช้สำหรับเชิญ `company_admin`/`supervisor`, รองรับ existing/proposed company และ one-time redemption แต่เก็บ token แบบ plaintext
- `student_profile` เป็น global one-to-one กับ User และมี health/accessibility/emergency data; `student_academic_record` ก็อ้าง User โดยตรง จึงยังไม่รองรับข้อมูลต่างกันต่อมหาวิทยาลัย
- Internship domain แยก module ใน code แล้ว และมีสอง intake paths ที่รวมที่ `placement`: company listing/application และ student self-arranged request
- มี `audit_event` และ `notification` แล้ว แต่ยังต้องเพิ่ม membership actor, outcome/redaction policy, idempotent outbox และ tenant scope ที่สม่ำเสมอ

ดังนั้นงานนี้เป็น **evolution ของ modular monolith ที่มีอยู่** ไม่ใช่ greenfield rewrite

## 3. Goals, non-goals, and success criteria

### 3.1 Goals

- บัญชีเดียวเข้าร่วมและสลับหลาย Workspace ได้
- รองรับ Workspace type อย่างน้อย `EDUCATIONAL_INSTITUTION` และ `COMPANY`
- แยก authentication, global identity, organization identity และ authorization ออกจากกัน
- รองรับ owner/admin/member, custom roles และ permissions แบบ tenant-scoped
- มี invitation และ verification flow ที่ตรวจสอบย้อนหลังได้
- ให้ผู้ใช้ควบคุมการเปิดเผยข้อมูล personal profile แก่ Workspace
- ทำให้ Internship เป็น module ที่เปิด/ปิดต่อ Workspace ได้
- รักษา workflow และข้อมูลเดิม พร้อม migration แบบ incremental

### 3.2 Non-goals

- ไม่สร้าง social/community features แบบ Discord เช่น chat, voice หรือ public discovery
- ไม่ทำ enterprise federation, SAML/SCIM หรือ multi-region ใน MVP
- ไม่ทำ policy engine แบบ ABAC ทั่วไปเต็มรูปแบบในรุ่นแรก
- ไม่เปิด marketplace สำหรับ third-party modules ใน V1
- ไม่ย้าย service ออกจาก modular monolith จนมีหลักฐานด้าน scale หรือ ownership

### 3.3 Observable success criteria

- User เดียวมี membership ที่ active ในหลาย Workspace และสลับ context ได้โดยไม่ sign in ใหม่
- ทุก tenant resource ถูกอ่าน/เขียนได้เฉพาะเมื่อ request มี active membership และ permission ที่เกี่ยวข้อง
- การเลือก `STUDENT` เองไม่ทำให้ได้สิทธิ์หรือสถานะ verified
- การรับ invitation ซ้ำหรือกด submit ซ้ำไม่สร้าง membership/decision ซ้ำ
- ทุก action สำคัญ เช่น role assignment, verification decision, grant revocation และ final submission มี immutable audit event
- migration สามารถเปิดใช้ต่อ Workspace/User cohort และ rollback traffic ได้โดยไม่สูญเสียข้อมูลเดิม

---

## 4. Product mental model

| Discord concept   | Trainy concept       | หมายเหตุ                            |
| ----------------- | -------------------- | ----------------------------------- |
| Account           | User                 | ตัวตนระดับแพลตฟอร์ม                 |
| Server            | Workspace            | ขอบเขตองค์กรและ tenant              |
| Server Member     | Workspace Membership | ความสัมพันธ์ User–Workspace         |
| Server Profile    | Workspace Profile    | ข้อมูลเฉพาะองค์กร                   |
| Roles             | Roles                | ชุด permissions ภายใน Workspace     |
| Invite Link       | Invitation           | มี expiry, intended type และ policy |
| Server Switcher   | Workspace Switcher   | สลับ active workspace               |
| Channels/Features | Modules              | Internship, Documents, Forms ฯลฯ    |
| Moderation Log    | Audit Log            | เหตุการณ์สำคัญแบบ append-only       |

ข้อแตกต่างสำคัญ: Trainy จัดการข้อมูลการศึกษา เอกสาร การประเมิน และลายเซ็น จึงต้องมี verification, consent/grants, purpose limitation, retention และ audit ที่ชัดเจนกว่า community platform

---

## 5. Domain language and invariants

### 5.1 User and profiles

- **User**: บุคคลหนึ่งคนบน Trainy; ไม่ควรเก็บ organization role ลงบน User
- **Auth Account**: วิธี sign in ที่เชื่อมกับ User เช่น password หรือ LINE subject
- **Personal Profile**: ข้อมูลที่ผู้ใช้ดูแลในระดับแพลตฟอร์ม เช่น preferred name, avatar, contact channels
- **Workspace Profile**: ข้อมูลที่ใช้ใน Workspace นั้น เช่น student ID, employee ID, faculty, department, title

### 5.2 Workspace and membership

- **Workspace**: tenant boundary และเจ้าของข้อมูลระดับองค์กร
- **Workspace Membership**: ความสัมพันธ์ระหว่าง User กับ Workspace พร้อม lifecycle ของการเข้าร่วม
- **Member Type**: classification ทางองค์กร เช่น `STUDENT`, `TEACHER`, `STAFF`, `EMPLOYEE`, `EXTERNAL_SUPERVISOR`, `OTHER`
- **Role**: กลุ่มของ permissions; เป็น system role หรือ custom role ก็ได้
- **Permission**: action เชิงเทคนิค/ธุรกิจ เช่น `membership.review`, `internship.application.approve`

### 5.3 Invitation and verification

- **Invitation**: สิทธิ์ในการเริ่ม join flow ไม่ใช่สิทธิ์ใช้งานปลายทางโดยอัตโนมัติ
- **Verification Claim**: คำกล่าวอ้างว่า membership เป็นบุคคลประเภทใด พร้อม identifier/evidence
- **Verification Decision**: ผลตรวจสอบ claim โดย registry, domain match หรือผู้มีอำนาจ

### 5.4 Consent and grants

- **Required Processing Acknowledgement**: การรับทราบการประมวลผลที่จำเป็นตามนโยบาย/ฐานกฎหมาย ไม่ควรปลอมเป็น optional consent
- **Profile Grant**: การอนุญาตให้ Workspace ใช้ข้อมูล Personal Profile บาง field เพื่อ purpose ที่ระบุ
- **Optional Consent**: ความยินยอมที่ถอนภายหลังได้ เช่น marketing หรือการแจ้งเตือนผ่านช่องทางเสริม

### 5.5 Invariants

1. `User` หนึ่งคนมี membership ต่อ Workspace ได้ไม่เกินหนึ่ง record ที่เป็น canonical; การกลับเข้าร่วมใช้ record เดิมหรือ history ตาม policy
2. Workspace ต้องมี Owner อย่างน้อยหนึ่งคนตลอดเวลา
3. Member Type ไม่มอบ permission โดยตรง; mapping เป็น role/default role ได้ผ่าน policy ที่ explicit เท่านั้น
4. Role assignment ใช้ได้เฉพาะ Workspace เดียวกัน
5. ผู้ใช้ห้าม approve verification claim ของตนเอง
6. Resource ของ module ต้องอยู่ใน Workspace เดียวกับ actor และ referenced resources ทั้งหมด
7. การ revoke grant หยุดการเข้าถึงในอนาคต แต่ไม่ลบข้อมูลที่ Workspace มีฐานเก็บรักษาโดยอัตโนมัติ
8. Audit event แก้ไขไม่ได้ผ่าน application API

---

## 6. Workspace model

### 6.1 Workspace types

```ts
type WorkspaceType = "EDUCATIONAL_INSTITUTION" | "COMPANY" | "PERSONAL"; // defer unless required by product
```

แต่ละ type กำหนด template เริ่มต้น ไม่ควร hard-code authorization ทั้งหมด:

| Type                      | Suggested member types                    | Default modules                                          |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `EDUCATIONAL_INSTITUTION` | STUDENT, TEACHER, STAFF, OTHER            | Internship, Documents, Forms, Evaluation, Audit          |
| `COMPANY`                 | EMPLOYEE, WORKPLACE_SUPERVISOR, HR, OTHER | Documents, Forms, Evaluation, Audit; Internship optional |
| `PERSONAL`                | INDIVIDUAL                                | Forms/Documents ตาม product decision                     |

### 6.2 Membership lifecycle

```text
INVITED / REQUESTED
        │
        ▼
PENDING_VERIFICATION ──reject──> REJECTED
        │
      verify
        ▼
      ACTIVE ──suspend──> SUSPENDED ──restore──> ACTIVE
        │
       leave/remove
        ▼
      INACTIVE
```

แนะนำ enum:

```ts
type MembershipStatus = "PENDING_VERIFICATION" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "INACTIVE";
```

`Invitation` มีสถานะแยก (`PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED`) เพื่อไม่ให้ invitation lifecycle ปนกับ membership lifecycle

### 6.3 Owner, admin, member

- `OWNER`: system role ที่มี authority สูงสุด รวมการโอน ownership; ไม่ควรลบหรือแก้ semantics
- `ADMIN`: system role สำหรับบริหารสมาชิก บทบาท module และ settings ตาม permission ที่กำหนด
- `MEMBER`: baseline role ที่ให้สิทธิ์พื้นฐาน เช่นอ่าน workspace shell และแก้ไข profile ของตน
- Workspace สร้าง custom roles เพิ่มได้ เช่น `INTERNSHIP_REVIEWER`, `DOCUMENT_OFFICER`

Owner/Admin/Member เป็น **Role** ไม่ใช่ Member Type

---

## 7. Identity, profiles, data ownership, and consent

### 7.1 Data ownership matrix

| Data                                     | Controller/owner in product model | Source of truth           | User edit                                   |
| ---------------------------------------- | --------------------------------- | ------------------------- | ------------------------------------------- |
| User identity, account state             | Trainy platform                   | Trainy Core               | จำกัดผ่าน account flow                      |
| Authentication credentials/accounts      | User + auth subsystem             | Better Auth/provider      | ผ่าน auth flow เท่านั้น                     |
| Personal profile                         | User                              | Trainy Core               | ได้ตาม field policy                         |
| Workspace metadata/settings              | Workspace                         | Workspace Core            | Owner/Admin                                 |
| Membership state                         | Workspace                         | Membership service        | ผ่าน join/leave/admin flow                  |
| Workspace profile registry fields        | Workspace                         | Registry/authorized staff | สมาชิกแก้เองไม่ได้                          |
| Workspace profile contact/display fields | User in workspace context         | Workspace Profile         | ตาม field policy                            |
| Verification evidence/decision           | Workspace                         | Verification service      | claim แก้ได้ก่อน review; decision แก้ไม่ได้ |
| Role assignments                         | Workspace                         | Authorization service     | authorized admin only                       |
| Internship/application records           | Workspace                         | Internship module         | ตาม workflow                                |
| Documents/forms/evaluations              | Workspace                         | Respective module         | ตาม workflow/retention                      |
| Audit events                             | Trainy for Workspace              | Audit subsystem           | append-only                                 |

คำว่า owner ในตารางหมายถึง product/data stewardship ไม่ใช่ข้อสรุปทางกฎหมาย ควรให้ฝ่ายกฎหมาย/PDPA ระบุ controller/processor และ retention policy ต่อ deployment

### 7.2 Personal Profile vs Workspace Profile

`PersonalProfile` เก็บเฉพาะข้อมูล cross-workspace ที่เหมาะสม เช่น preferred name, avatar, verified contact point ส่วนข้อมูลทะเบียนองค์กรต้องอยู่ใน `WorkspaceProfile` เพื่อป้องกัน Workspace หนึ่งแก้ข้อมูลที่กระทบอีก Workspace

ตัวอย่าง:

```text
PersonalProfile
├── preferred_name
├── avatar_asset_id
├── contact_email (verified state แยก)
└── phone (verified state แยก)

WorkspaceProfile: University A
├── display_name
├── student_id
├── faculty_id
├── program_id
├── academic_level
└── institutional_email
```

### 7.3 Profile grants

Workspace ไม่ควร copy personal data ทุก field ตอน join โดยอัตโนมัติ ให้ประกาศ `WorkspaceDataRequest` หรือ policy version ว่าต้องการ field ใด เพื่อ purpose ใด และจำเป็นหรือ optional

```text
Workspace requests: contact_email
Purpose: internship coordination
Required: yes
Retention: membership + configured period
Source: linked reference to Personal Profile or workspace snapshot
```

`ProfileGrant` ควรบันทึก:

- user, workspace, field/scope, purpose, policy version
- legal/processing basis category ที่ระบบใช้แยก required acknowledgement จาก optional consent
- granted/revoked timestamps
- source value version หรือ snapshot reference เมื่อจำเป็นต่อหลักฐาน

สำหรับข้อมูลที่ต้องคงหลักฐาน ณ เวลาทำรายการ เช่นชื่อบนเอกสาร ให้ domain module เก็บ immutable snapshot พร้อม provenance แทนการอ้าง profile ปัจจุบันเพียงอย่างเดียว

---

## 8. Authorization model

ใช้ **RBAC + resource scope checks + workflow rules**:

```text
Allow request only if:
1. authenticated user/session is valid
2. selected workspace exists and membership is ACTIVE
3. membership has required permission through role assignment
4. resource.workspace_id == selected workspace_id
5. resource relationship/scope rule passes
6. workflow state permits the action
```

ตัวอย่าง: อาจารย์อนุมัติคำร้องได้เมื่อมี `internship.application.approve`, คำร้องอยู่ Workspace เดียวกัน, อาจารย์อยู่ใน academic/assignment scope ที่กำหนด และคำร้องอยู่สถานะที่ approve ได้

### 8.1 Permission naming

ใช้รูปแบบ `<module>.<resource>.<action>`:

```text
workspace.settings.read
workspace.settings.update
membership.read
membership.invite
membership.review
membership.role.assign
profile.workspace.read
profile.workspace.update.self
internship.application.create
internship.application.read
internship.application.approve
document.issue
evaluation.submit
audit.read
```

### 8.2 Scope

Permission เพียงอย่างเดียวไม่พอ ต้องรองรับ scope อย่างน้อย:

- `SELF` — resource ของ membership ตนเอง
- `ASSIGNED` — นักศึกษา/งานที่ถูก assign ให้
- `ORG_UNIT` — faculty, department, program หรือทีม
- `WORKSPACE` — ทั้ง Workspace

MVP เก็บ scope เป็น structured assignment (`scope_type`, `scope_ref_id`) แทนสร้างภาษา policy แบบ generic

### 8.3 Enforcement rules

- Backend เป็น enforcement point หลัก; frontend ใช้ permission เพื่อซ่อน/disable UX เท่านั้น
- ห้ามเชื่อ `workspace_id`, `membership_id`, owner ID หรือ role จาก client โดยไม่ตรวจความสัมพันธ์ใหม่
- Repository/query ทุกตัวรับ `WorkspaceContext` ที่ผ่านการ validate แล้ว
- หลีกเลี่ยง generic `findById(id)` สำหรับ tenant data; ใช้ `findById({ workspaceId, id })`
- งาน background และ signed URL ต้อง carry tenant/resource scope อย่างชัดเจน
- การเปลี่ยน active workspace ต้อง invalidate workspace-scoped cache และ re-evaluate permission

---

## 9. Onboarding, invitation, and verification flows

### 9.1 Global account onboarding

```text
Sign up / Sign in
→ verify authentication method/contact as required
→ create or link User safely
→ complete minimum Personal Profile
→ accept current required platform acknowledgement
→ enter Workspace picker or join/create flow
```

Account linking ต้องยืนยันผ่าน account เดิมหรือ recovery flow; ห้าม merge เพียงเพราะ email ตรงกัน และ LINE display name ห้ามเป็น identifier

### 9.2 Join educational Workspace without invite

```text
Discover/enter Workspace code
→ choose claimed Member Type
→ show fields based on type
→ show requested personal-profile fields and purposes
→ create Membership(PENDING_VERIFICATION)
→ create VerificationClaim(PENDING)
→ automatic registry match or staff review
→ VERIFIED: activate membership + assign baseline roles
→ REJECTED/NEEDS_INFO: explain reason and correction path
```

ข้อมูลตัวอย่าง:

- Student: student ID, program/faculty (เลือกหรือดึงจาก registry), institutional email
- Teacher/Staff: personnel ID, department, position/title
- Other: relationship, sponsor/inviter, supporting information

### 9.3 Invitation flow

Invitation มีสองแบบ:

1. **Open/link invitation** — จำกัด Workspace, expiry, max uses และ suggested member type
2. **Targeted invitation** — ผูก recipient email/identifier, intended member type/roles และ one-time use

Flow:

```text
Open invite link
→ validate token hash, state, expiry, revocation, usage policy
→ sign in/sign up
→ show inviter + Workspace + requested/intended membership
→ user confirms Member Type and requested data
→ accept idempotently
→ verify according to Workspace policy
→ activate and assign only approved/default roles
```

`suggested_member_type` เป็นค่า preselect ที่ผู้ใช้แก้ได้ ส่วน `intended_member_type` เป็นข้อจำกัดของ targeted invite; หากไม่ตรงให้หยุดและขอ invitation ใหม่ ไม่ควร silently change type

Invitation อาจข้าม manual verification ได้เฉพาะเมื่อ policy ระบุว่า inviter/issuer เป็น trusted authority สำหรับชนิดนั้น และระบบต้องสร้าง verification decision ว่า verified by invitation policy ไม่ใช่ข้ามร่องรอยตรวจสอบ

### 9.4 Verification flow

Verification methods:

- `REGISTRY_MATCH` — match กับ student/personnel registry
- `DOMAIN_EMAIL` — ยืนยัน email domain; เป็น evidence ไม่จำเป็นต้องเพียงพอเสมอ
- `INVITATION_ATTESTATION` — trusted invitation
- `MANUAL_REVIEW` — staff/admin review
- `DOCUMENT_EVIDENCE` — defer; ใช้เมื่อจำเป็นและต้องมี retention/security เพิ่ม

State:

```text
DRAFT → PENDING → VERIFIED
                ↘ NEEDS_INFORMATION → PENDING
                ↘ REJECTED
                ↘ CANCELLED
```

Decision ต้องบันทึก reviewer/method, timestamp, reason code, note visibility, policy version และ evidence references โดยหลีกเลี่ยงการใส่ PII เต็มใน audit payload

### 9.5 Create Workspace

- User ที่ผ่าน minimum account requirements สร้าง Workspace ได้ตาม platform policy
- ผู้สร้างได้ `OWNER` role และ active membership ภายใน transaction เดียว
- เลือก Workspace type, name, slug, locale/timezone และ module template
- Educational Institution อาจต้อง platform approval ก่อนใช้ verified branding หรือ registry integration

### 9.6 Leave/remove/suspend

- Owner คนสุดท้ายออกไม่ได้จนกว่าจะโอน ownership
- การ remove member ต้อง preserve domain records ตาม retention policy และ revoke active access/session scope
- Suspension ต้องระบุ reason และสร้าง audit event
- Pending tasks/documents ต้องมี reassignment policy ไม่ควร orphan โดยอัตโนมัติ

---

## 10. Workspace switching UX

### 10.1 Interaction model

- Desktop: Workspace switcher อยู่ส่วนบนของ sidebar; แสดง logo, name, type และ current context
- Mobile: Workspace switcher อยู่ใน app/header sheet ไม่แย่ง primary module navigation
- รายการเรียงจาก recent Workspace และแบ่ง `Active`, `Pending`, `Suspended` อย่างชัดเจน
- User มี account menu ระดับ global แยกจาก workspace settings
- URL ต้องมี workspace identity เช่น `/w/:workspaceSlug/internship/...` เพื่อ bookmark/share ได้อย่างปลอดภัย

### 10.2 Switching behavior

```text
Select Workspace
→ resolve membership and status
→ load module manifest + permissions
→ clear prior workspace query/cache state
→ navigate to last safe route or Workspace home
```

- ห้ามคง route/resource ID จาก Workspace ก่อนหน้าหากตรวจ scope ไม่ผ่าน
- ถ้า module เดิมไม่มีใน Workspace ใหม่ ให้ไป Workspace home พร้อมข้อความสั้น
- Pending/Suspended membership เปิดได้เฉพาะ status/appeal/join completion page
- เก็บ `last_workspace_id` เป็น UX preference ไม่ใช่ authorization fact
- เปิดหลาย tab ต่าง Workspace ได้; server ต้อง authorize จาก workspace ใน request ไม่พึ่ง global active state เพียงอย่างเดียว

### 10.3 Workspace home

รักษาหลักการเดิมของ Trainy: เป็น action-oriented home แสดงสิ่งที่ต้องทำ, ผู้รับผิดชอบ, deadline และสถานะรอ ไม่ใช่ dashboard ตัวเลขทั่วไป แต่ composition ของหน้าเกิดจาก modules ที่เปิดใช้และ permissions ของสมาชิก

---

## 11. Module architecture

เริ่มด้วย **modular monolith** บน Bun + Hono เพราะ transaction, deployment และ migration ง่ายกว่า microservices โดยกำหนด boundary ใน code/schema ให้ชัดเจน

```text
Trainy Application
├── Core
│   ├── Identity/Auth Adapter
│   ├── Workspace
│   ├── Membership
│   ├── Authorization
│   ├── Invitation
│   ├── Verification
│   ├── Profile & Grants
│   ├── Module Registry
│   ├── Notification
│   └── Audit
└── Modules
    ├── Internship
    ├── Documents
    ├── Forms
    └── Evaluation
```

### 11.1 Module contract

แต่ละ module ต้องประกาศ:

- module key/version และ supported workspace types
- routes/API entry points
- required permissions
- navigation items และ home tasks provider
- tables/data ownership
- events emitted/consumed
- enable/disable preconditions
- retention/export behavior

`workspace_modules` ระบุ module ที่เปิดใช้และ configuration version แต่การปิด module ต้อง disable access ก่อน ไม่ลบข้อมูลทันที

### 11.2 Module responsibilities

| Module       | Owns                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Core         | identity linkage, tenancy, membership, authorization, invitations, verification, grants, audit |
| Internship   | applications, placements, supervision, terms/rounds, activity logs/hours, workflow             |
| Documents    | metadata, versions, storage references, issuance, signatures integration                       |
| Forms        | definitions, versions, submissions, reusable questions                                         |
| Evaluation   | evaluation cycles, assignments, responses/scores, disclosure policy                            |
| Notification | user inbox/delivery preferences and domain-event projections                                   |

Evaluation อาจใช้ Forms เป็น schema/response engine แต่ยังคง business policy ของ evaluation เอง ไม่ให้ Forms ตัดสิน score visibility หรือ evaluator assignment

### 11.3 Events and transactions

- ใช้ in-process domain events + transactional outbox สำหรับ side effects ที่ต้อง retry เช่น notification
- State change หลักและ audit/outbox insert อยู่ transaction เดียวกัน
- Consumer ต้อง idempotent ด้วย event ID/idempotency key
- ไม่ต้องมี message broker ใน MVP; outbox worker ใน deployment เดียวพอ

---

## 12. Suggested PostgreSQL data model

ชื่อและ field ด้านล่างเป็น **target logical schema** โดยชื่อ `workspaces`/`workspace_*` ใช้อธิบายแนวคิด เพื่อให้ implementation กระทบน้อยที่สุดควร map ลงบน `organization`/`organization_*` เดิมแบบ expand-and-migrate ก่อน ไม่ควร rename ตารางเพียงเพื่อให้ตรงศัพท์ใน UX

### 12.1 Core identity

```text
users
  id UUID PK
  status
  display_name
  created_at, updated_at

auth_accounts / sessions / verifications
  managed by Better Auth where applicable
  user_id FK users.id

personal_profiles
  user_id PK/FK
  preferred_name, avatar_asset_id
  contact_email, contact_email_verified_at
  phone, phone_verified_at
  locale, timezone
  profile_version
  updated_at

policy_acknowledgements
  id, user_id, policy_type, policy_version
  acknowledged_at, evidence_metadata
  UNIQUE(user_id, policy_type, policy_version)
```

### 12.2 Workspace and membership

```text
workspaces
  id UUID PK
  type, name, slug, status
  locale, timezone
  settings JSONB
  created_by_user_id
  created_at, updated_at
  UNIQUE(slug)

workspace_memberships
  id UUID PK
  workspace_id FK
  user_id FK
  status
  joined_at, suspended_at, left_at
  created_at, updated_at
  UNIQUE(workspace_id, user_id)

member_types
  id UUID PK
  workspace_id NULLABLE  -- null = system template
  key, label, status
  UNIQUE(workspace_id, key)

membership_member_types
  membership_id FK
  member_type_id FK
  is_primary
  source, assigned_at
  UNIQUE(membership_id, member_type_id)
```

รองรับหลาย member types ตั้งแต่ schema แต่ MVP UI อาจให้มี primary type เดียว เพื่อลด migration ในอนาคตเมื่อคนหนึ่งเป็นทั้งศิษย์เก่าและบุคลากร

### 12.3 Roles, permissions, and scope

```text
roles
  id UUID PK
  workspace_id FK
  key, name
  kind SYSTEM|CUSTOM
  is_managed, created_at
  UNIQUE(workspace_id, key)

permissions
  key TEXT PK
  module_key, description

role_permissions
  role_id FK
  permission_key FK
  PRIMARY KEY(role_id, permission_key)

membership_role_assignments
  id UUID PK
  membership_id FK
  role_id FK
  scope_type SELF|ASSIGNED|ORG_UNIT|WORKSPACE
  scope_ref_id NULLABLE
  granted_by_membership_id
  granted_at, expires_at
```

ห้ามมี role ที่อ้าง Workspace คนละตัวกับ membership; enforce ผ่าน service transaction และถ้าเหมาะสมใช้ composite foreign key/constraint ในฐานข้อมูล

### 12.4 Workspace profiles, grants, verification

```text
workspace_profiles
  id UUID PK
  workspace_id FK
  membership_id FK UNIQUE
  display_name
  institutional_identifier
  institutional_email
  org_unit_id
  attributes JSONB
  source, verified_at
  created_at, updated_at

workspace_profile_field_definitions
  id, workspace_id, key, data_type
  member_type_key, required, user_editable
  sensitivity, validation_schema, display_order

workspace_data_requests
  id, workspace_id, field_key, purpose_key
  required, policy_version, retention_policy_key, active

profile_grants
  id, user_id, workspace_id
  field_key, purpose_key, basis_type
  policy_version, granted_at, revoked_at
  UNIQUE(user_id, workspace_id, field_key, purpose_key, policy_version)

verification_claims
  id, membership_id, claimed_member_type_id
  method, status
  identifier_normalized, evidence_ref
  submitted_at, decided_at
  decided_by_membership_id, reason_code, note
```

ข้อมูลที่ค้นหาบ่อยและเป็น invariant เช่น institutional identifier ควรเป็น typed column ไม่ฝังไว้ใน JSONB ทั้งหมด; `attributes` ใช้สำหรับ field ที่ custom จริง

### 12.5 Invitations

```text
workspace_invitations
  id UUID PK
  workspace_id FK
  token_hash
  type OPEN|TARGETED
  recipient_normalized NULLABLE
  suggested_member_type_id NULLABLE
  intended_member_type_id NULLABLE
  issued_by_membership_id
  expires_at, max_uses, use_count
  status, created_at

invitation_role_templates
  invitation_id FK
  role_id FK
  scope_type, scope_ref_id

invitation_acceptances
  id, invitation_id, user_id, membership_id
  accepted_at
  UNIQUE(invitation_id, user_id)
```

เก็บเฉพาะ hash ของ secret token; targeted recipient ควร normalize และพิจารณา keyed hash หากไม่ต้องแสดงค่าเดิม

### 12.6 Module registry and organization structure

```text
workspace_modules
  workspace_id FK
  module_key
  status ENABLED|DISABLED
  config_version
  settings JSONB
  enabled_at, disabled_at
  PRIMARY KEY(workspace_id, module_key)

organization_units
  id, workspace_id
  type FACULTY|DEPARTMENT|PROGRAM|TEAM|OTHER
  parent_id NULLABLE
  code, name, status
  UNIQUE(workspace_id, type, code)
```

### 12.7 Audit, idempotency, and outbox

```text
audit_events
  id UUID PK
  workspace_id NULLABLE
  actor_user_id, actor_membership_id NULLABLE
  action, resource_type, resource_id
  outcome, reason_code
  metadata_redacted JSONB
  request_id, ip_hash, user_agent_summary
  occurred_at

idempotency_keys
  workspace_id, actor_user_id, key
  operation, request_hash, response_ref, expires_at
  UNIQUE(workspace_id, actor_user_id, key)

outbox_events
  id, workspace_id, event_type, aggregate_type, aggregate_id
  payload, occurred_at, processed_at, retry_count
```

### 12.8 Index and constraint baseline

- Index tenant tables ด้วย `(workspace_id, id)` และ query patterns สำคัญ เช่น `(workspace_id, status, created_at)`
- Unique student/employee identifier ตาม Workspace และ member type ด้วย partial/composite unique index ตาม policy
- Index active role assignments และ unprocessed outbox events
- ใช้ CHECK constraints สำหรับ timestamps/state ที่ทำได้
- Foreign keys เปิดไว้; soft delete ใช้เฉพาะ entity ที่ต้องรักษา history
- พิจารณา PostgreSQL Row-Level Security เป็น defense-in-depth หลัง application scoping มี test ครบ ไม่ใช้แทน authorization layer

---

## 13. Internship and other module data

### 13.1 Internship ownership and references

```text
internship_terms
  id, workspace_id, name, start_at, end_at, status

internship_applications
  id, workspace_id
  student_membership_id
  term_id, status, current_assignee_membership_id
  submitted_at, approved_at

internship_placements
  id, workspace_id, application_id
  host_organization_name / linked_workspace_id NULLABLE
  position, start_date, end_date, arrangement

supervision_assignments
  id, workspace_id
  student_membership_id, supervisor_membership_id
  type ACADEMIC|WORKPLACE
  start_at, end_at

activity_logs
  id, workspace_id, placement_id
  author_membership_id, period, content, status

work_hours
  id, workspace_id, placement_id
  date, minutes, source, status
```

Workplace supervisor อาจเป็น member ของ university Workspace ผ่าน targeted invitation ใน MVP ส่วน cross-workspace collaboration จริงระหว่าง University Workspace และ Company Workspace ให้ defer และออกแบบ contract ภายหลัง

### 13.2 Documents

- `documents`: workspace, owner module/resource, classification, state
- `document_versions`: immutable asset reference, checksum, uploader, scan status
- `document_access`: หาก access เกินกว่าที่ derive จาก domain policy
- `signature_requests/signatures`: แยก intent, signer, signed artifact hash และ provider metadata

### 13.3 Forms and evaluations

- Form definition ต้อง versioned; submission อ้าง version ที่ใช้จริง
- Final submission immutable หรือแก้ผ่าน amendment flow
- Evaluation แยก evaluator assignment, subject, form version, response และ disclosure policy
- คะแนน/comment visibility ตรวจใน backend ตาม Workspace policy และ relationship scope

---

## 14. API and code boundaries

### 14.1 Request context

ทุก workspace API สร้าง context กลาง:

```ts
type WorkspaceRequestContext = {
  requestId: string;
  userId: string;
  workspaceId: string;
  membershipId: string;
  membershipStatus: "ACTIVE";
  permissions: Set<string>;
  assignments: AuthorizationScope[];
};
```

Middleware ลำดับแนะนำ:

```text
Better Auth session
→ resolve workspace by route slug/id
→ resolve active membership
→ load/cache role permissions and scopes
→ validate input with Zod
→ application service authorization + workflow checks
→ repository with mandatory workspace context
→ audit/outbox
```

### 14.2 Route groups

```text
/api/v1/me
  /profile
  /memberships
  /policy-acknowledgements

/api/v1/workspaces
  POST /                         create
  GET  /                         list accessible workspaces
  GET  /:workspaceId
  POST /:workspaceId/invitations
  POST /:workspaceId/join-requests
  GET  /:workspaceId/members
  POST /:workspaceId/verifications/:claimId/decision
  PUT  /:workspaceId/members/:membershipId/roles
  GET  /:workspaceId/modules

/api/v1/w/:workspaceId/internship/...
/api/v1/w/:workspaceId/documents/...
/api/v1/w/:workspaceId/forms/...
/api/v1/w/:workspaceId/evaluations/...
```

Hono RPC ใช้แชร์ typed contract กับ React ได้ แต่ไม่ควรให้ frontend import internal repositories/domain implementation; export เฉพาะ route contract และ shared DTO/schema ที่ตั้งใจเป็น public boundary

### 14.3 Error contract

```ts
type ApiError = {
  code: string; // e.g. MEMBERSHIP_NOT_ACTIVE
  message: string; // localized-safe or translation key
  requestId: string;
  fieldErrors?: Record<string, string[]>;
  retryable?: boolean;
};
```

- `401`: session ไม่ valid
- `403`: authenticated แต่ไม่มี membership/permission/scope; ไม่เผยข้อมูล resource
- `404`: resource ไม่พบหรือซ่อน existence เมื่อจำเป็น
- `409`: state conflict, duplicate acceptance, stale version
- `422`: input/domain validation

Consequential commands รองรับ `Idempotency-Key` และ optimistic version สำหรับ concurrent decisions

### 14.4 Internal module interfaces

Core expose capability-oriented interfaces เช่น:

```ts
authorization.require(ctx, "internship.application.approve", resourceScope);
profiles.getWorkspaceIdentity(ctx, membershipId, fields);
audit.record(tx, event);
outbox.publish(tx, event);
```

Module อื่นห้าม query ตาราง Core โดยตรงนอก read model/interface ที่อนุมัติ เพื่อลด coupling และทำให้แยก service ในอนาคตได้หากจำเป็น

---

## 15. Frontend architecture and UX states

React + shadcn/ui สามารถ reuse ได้ โดยเพิ่ม shell ระดับ Workspace:

```text
App
├── Global Account Layer
│   ├── Sign in / recovery
│   ├── Personal profile
│   └── Workspace picker
└── Workspace Shell
    ├── Workspace switcher
    ├── Permission-aware module navigation
    ├── Action-oriented home
    ├── Module routes
    └── Workspace/member settings
```

Frontend state แยก:

- global session/user query
- membership list
- current workspace context keyed by workspace ID
- permission/module manifest keyed by workspace ID
- module data cache ที่ key ต้องขึ้นต้นด้วย workspace ID

ทุก view ต้องมี loading, empty, validation error, recoverable error, offline, unauthenticated, forbidden, read-only และ success state ตาม requirements เดิม

การซ่อนปุ่มตาม permission ช่วย UX แต่ทุก command ต้องถูกตรวจซ้ำบน server

---

## 16. Security, privacy, and audit principles

### 16.1 Tenant isolation

- Deny by default เมื่อไม่มี Workspace context
- ทดสอบ cross-tenant access ทุก repository/endpoint สำคัญ
- Object storage key แยก prefix ตาม Workspace; signed URL อายุสั้นและตรวจ authorization ก่อนออก
- Cache key, search index, export, logs และ analytics ต้องมี tenant scope
- Backup/restore และ support tooling ต้องรักษา tenant boundary

### 16.2 Authentication and session

- ใช้ Better Auth เป็น auth layer และแยก external accounts จาก User
- LINE ใช้ Authorization Code + PKCE, validate `state`, `nonce`, issuer/audience และ redirect URI
- ห้าม log token, password, reset secret หรือ raw invitation token
- Role/permission/member status change ที่เสี่ยงต้องทำให้ session authorization cache stale ทันทีหรือมี short TTL + version check
- Actions สำคัญ เช่น transfer ownership หรือ export ข้อมูล อาจ require recent authentication ใน V1

### 16.3 Sensitive data

- จำแนก field เช่น public-within-workspace, internal, confidential, highly sensitive
- เก็บข้อมูลเท่าที่จำเป็นและกำหนด retention/deletion ต่อชนิดข้อมูล
- Encrypt in transit และ at rest; field-level encryption ใช้กับ evidence/identifiers ที่ threat model กำหนด
- Audit payload ต้อง redact/minimize PII
- เอกสาร upload ต้องตรวจชนิด/ขนาด, malware scan, random storage key และห้าม render active content โดยตรง

### 16.4 Audit

Audit อย่างน้อยสำหรับ:

- workspace creation/settings/module change
- invitation issue/revoke/accept
- membership approve/reject/suspend/remove
- verification decision
- role/permission assignment
- profile grant/consent/acknowledgement change
- document access/issue/sign where policy requires
- application/evaluation final decisions
- export และ sensitive admin access

Audit event แยกจาก user-facing activity history: activity history อาจแสดงภาษาที่เข้าใจง่ายและจำกัด visibility ขณะที่ audit มี security/operational purpose

### 16.5 Abuse and failure controls

- Rate limit sign-in, invitation validation, verification submit และ identifier lookup
- ป้องกัน account/workspace enumeration ด้วย generic errors เมื่อเหมาะสม
- Idempotency สำหรับ accept invite, approve/reject, final submission และ webhook
- Outbox retry มี backoff/dead-letter visibility; ไม่เปลี่ยน domain decision ซ้ำ
- มี metrics สำหรับ authorization denied, cross-tenant guard failure, verification backlog และ notification failures

---

## 17. Migration and reuse map

ตารางนี้อ้างอิง Drizzle source และ snapshot `0018` ปัจจุบันโดยตรง อย่างไรก็ตามยังต้องตรวจ production row counts, orphan/duplicate data, enum usage และ data quality ก่อนเขียน migration จริง

| Existing                                                 | Target                                                             | Action                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`, `account`, `session`, `verification`             | เดิม + `personal_profile`/policy tables                            | **Keep/split** Better Auth identity; ห้ามย้าย org role เข้า User                                                                                |
| `organization`                                           | Workspace aggregate (physical table คงชื่อเดิม)                    | **Keep/extend** type/status/slug; เพิ่ม settings, locale/timezone และ lifecycle fields ตามจำเป็น                                                |
| `organization_membership.role`                           | `member_type` + role assignments                                   | **Expand/split** map enum เดิมเป็น claimed/verified member type และ managed role อย่าง explicit                                                 |
| `organization_membership.status`                         | richer membership lifecycle                                        | **Expand** จาก `active/suspended` เป็น pending/rejected/inactive โดยคง compatibility ระหว่าง rollout                                            |
| `onboarding_request`                                     | join request + `verification_claim`/decision history               | **Split** mutable profile claim ออกจาก immutable decisions; เลิก unique ต่อ User และ scope ต่อ Workspace                                        |
| `organization_invite`                                    | generalized Workspace invitation                                   | **Harden/extend** hash token, recipient/max-use/type/intended member type และ acceptance table; preserve company bootstrap behavior             |
| `student_profile`                                        | `personal_profile` + sensitive private profile + Workspace profile | **Split carefully**: address/contact อาจเป็น personal; student ID/program เป็น Workspace; health/emergency fields ต้องคง restrictive projection |
| `student_academic_record`                                | Workspace-scoped verified academic record                          | **Re-key** ด้วย membership/organization; เก็บ staff provenance                                                                                  |
| `academic_faculty`, `academic_major`                     | `organization_unit` หรือ academic units เดิม                       | **Reuse**; เพิ่ม hierarchy abstractionเฉพาะเมื่อ Company/team หรือ nested units ต้องใช้จริง                                                     |
| `internship`                                             | Internship module listing                                          | **Keep** company ownership; ทบทวน creator จาก User เป็น membership reference                                                                    |
| `internship_application`                                 | Internship module application                                      | **Keep/extend** organization + student membership refs และ tenant-safe uniqueness                                                               |
| `internship_request` + approvals/submissions/documents   | Internship module request aggregate                                | **Keep** workflow/version/idempotency; เปลี่ยน actor/assignee refs เป็น membership เมื่อพร้อม                                                   |
| `placement`                                              | Internship module aggregate root                                   | **Keep** สอง intake paths; เพิ่ม explicit membership refs และ cross-org relationship policy                                                     |
| attendance/leave/progress tables                         | Internship activity submodules                                     | **Keep**; tenant derive ผ่าน placement ได้ แต่ repository ต้องบังคับ organization scope                                                         |
| `cwie_entry`, `cwie_visit`, `cwie_monthly_summary`       | CWIE capability ภายใน Internship                                   | **Keep** เป็น optional capability/module configuration                                                                                          |
| `placement_document`, `internship_request_document`      | Documents module facade + versioned assets                         | **Evolve** โดยรักษา domain link, classification, checksum และ authorization context                                                             |
| `placement_evaluation`                                   | legacy evaluation compatibility                                    | **Retire gradually** หลัง migrate ไป configurable evaluation model                                                                              |
| `evaluation_scheme/component/criterion/submission/score` | Evaluation + Forms boundaries                                      | **Reuse** scheme/version data; เพิ่ม round, assignment และ disclosure policy                                                                    |
| `notification`                                           | Notification projection                                            | **Keep/extend** organization context, deep link และ delivery/idempotency state                                                                  |
| `audit_event`                                            | hardened audit log                                                 | **Keep/extend** actor membership, outcome, reason, redacted metadata และ retention; append-only at API level                                    |

### 17.1 Stack reuse

| Current stack       | Decision                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL          | Keep; ใช้ FK, constraints, indexes, transactions และ optional RLS defense-in-depth                                                  |
| Bun                 | Keep หาก production/runtime compatibility ของ dependencies ปัจจุบันผ่าน test                                                        |
| Hono                | Keep; แบ่ง route/application/repository boundaries ตาม Core และ modules                                                             |
| Zod Validator       | Keep; ใช้ validation ที่ API boundary แต่ domain invariants อยู่ใน application/domain layerด้วย                                     |
| Better Auth + LINE  | Keep; User/provider separation ตรงกับ target model; harden linking/OIDC/session flows                                               |
| Hono RPC            | Keep สำหรับ typed client contract; ห้าม expose internal model โดยไม่ตั้งใจ                                                          |
| React + shadcn/ui   | Keep; เพิ่ม Workspace Shell/switcher และ permission-aware navigation                                                                |
| Existing prototypes | Reuse information architecture, action-first UX, responsive patterns; เปลี่ยน role-specific shell เป็น module-aware workspace shell |

### 17.2 Migration phases

#### Phase 0 — Inventory and decisions

- export schema, constraints, row counts, orphan/duplicate analysis
- ระบุ default legacy organization/Workspace และ ownership
- map legacy role ทุกค่าเป็น member type + target roles/permissions
- ตกลง retention, legal basis, verification policy และ identifier uniqueness
- เพิ่ม contract/cross-tenant test harness ก่อนย้าย traffic

#### Phase 1 — Additive Core schema

- สร้าง workspaces, memberships, profiles, roles/permissions, module registry, audit/outbox
- seed default Workspace จากองค์กรเดิม
- backfill membership หนึ่งรายการต่อ legacy user
- backfill workspace profiles จาก academic/teacher/employee info
- ยังไม่ลบหรือ rename legacy columns

#### Phase 2 — Authorization shadow mode

- derive target permissions แต่ระบบเดิมยังเป็น enforcement หลัก
- เปรียบเทียบ legacy allow/deny กับ new authorization และเก็บ mismatch แบบไม่ log PII
- แก้ mapping/data quality จนผ่าน acceptance threshold ที่ทีมกำหนด

#### Phase 3 — Dual-read, controlled write

- API ใหม่ใช้ Workspace context และอ่าน target schema
- จำกัด dual-write ให้อยู่ใน service เดียว/transaction เดียวเมื่อทำได้; หลีกเลี่ยง frontend เขียนสอง API
- เปิด cohort ต่อ Workspace/User และมี feature flag rollback ไป read path เดิม

#### Phase 4 — Module cutover

- ย้าย Internship endpoints/UI ไป module boundary
- เพิ่ม `workspace_id` และ membership references ใน domain records
- เปิด Documents, Forms, Evaluation ตามลำดับ dependency
- reconcile counts, states, documents checksums และ final decisions

#### Phase 5 — Multi-workspace enablement

- เปิด invitation/join/switcher หลัง query และ cache ทุกจุดผ่าน tenant isolation tests
- เปิด Workspace creation เฉพาะ admin/internal cohort ก่อน
- monitor denied access, mismatch, duplicate memberships และ support incidents

#### Phase 6 — Legacy retirement

- หยุด legacy writes
- archive mapping tables และ migration provenance
- ลบ legacy columns/tables ใน release แยกหลัง rollback window
- อัปเดต backup, export, support runbook และ data dictionary

### 17.3 Rollback and reconciliation

- ทุก backfill มี deterministic mapping และ migration run ID
- เก็บ `legacy_id`/mapping table ชั่วคราวแทนการเดาจากชื่อหรือ email
- ทำ checksum/count reconciliation ต่อ Workspace และ entity state
- Rollback traffic ด้วย feature flag; schema additive จนพ้น stabilization window
- ห้าม rollback ด้วยการลบ target dataที่มี writes ใหม่; ใช้ forward reconciliation

---

## 18. MVP and V1 scope

### 18.1 MVP — foundation + existing internship use case

รวม:

- User + Better Auth Email/Password and LINE
- Educational Institution Workspace หนึ่งหรือหลายแห่งที่ platform provision ให้
- Workspace membership, primary member type, status
- system roles OWNER/ADMIN/MEMBER และ permissions ที่จำเป็น
- targeted/open invitations พร้อม expiry/revoke/idempotent accept
- manual verification + optional registry adapter interface
- Personal Profile, Workspace Profile, required acknowledgement และ basic Profile Grants
- Workspace switcher และ permission-aware shell
- module registry
- Internship workflow เดิม, Documents, basic Forms/Evaluation integration
- audit events, transactional outbox และ in-app notifications
- migration ของ legacy university

MVP custom roles อาจให้ backend รองรับ แต่ UI บริหาร role จำกัดเฉพาะ system templates เพื่อลดความเสี่ยง misconfiguration

### 18.2 V1 — administration and broader organization support

- Company Workspace และ company-specific member types/profile fields
- Custom role management UI และ org-unit scopes
- self-service Workspace creation/branding ตาม platform policy
- automated registry sync และ reconciliation UI
- configurable data request/purpose/retention policies
- exports, access review, ownership transfer, advanced audit search
- workplace supervisor onboarding ที่สมบูรณ์
- step-up authentication สำหรับ sensitive admin operations

### 18.3 Defer

- Cross-workspace shared resource/federation ระหว่างมหาวิทยาลัยกับบริษัท
- SAML/SCIM, enterprise directory provisioning
- Generic policy language/ABAC engine
- Third-party module marketplace/plugin runtime
- Public Workspace discovery/community/chat
- Microservices/event broker แยก deployment
- User-controlled multiple simultaneous primary personas ใน UI
- Evidence document verification จนกว่าจะมี threat/retention design
- Full digital-signature provider integration หากยังไม่มี legal/technical requirement

---

## 19. Key workflows and state ownership

| Workflow             | State owner           | Transaction boundary                             | Side effects                    |
| -------------------- | --------------------- | ------------------------------------------------ | ------------------------------- |
| Create Workspace     | Core Workspace        | workspace + owner membership + roles + modules   | audit, onboarding notification  |
| Accept invite        | Invitation/Membership | validate use + acceptance + membership/claim     | audit, notify inviter/reviewer  |
| Verify member        | Verification          | decision + membership activation + default roles | audit, notify member            |
| Assign role          | Authorization         | assignment + authz version increment             | audit, cache invalidation       |
| Submit application   | Internship            | application transition + snapshot + outbox       | audit, reviewer notification    |
| Approve application  | Internship            | decision/state transition + outbox               | audit, student notification     |
| Final evaluation     | Evaluation            | immutable submission + score policy snapshot     | audit, notification             |
| Revoke profile grant | Profile/Grant         | grant revoke + visibility version                | audit, downstream access update |

---

## 20. Testing and acceptance plan

### 20.1 Core invariants

- User A ใน Workspace 1 อ่าน/แก้ resource ของ Workspace 2 ไม่ได้ แม้เดา UUID ถูก
- Member Type อย่างเดียวไม่ผ่าน permission check
- Suspended/Pending member เข้า module API ไม่ได้
- Owner คนสุดท้ายออก/ถูกลบไม่ได้
- Role assignment ข้าม Workspace ถูก reject
- Invitation expired/revoked/over-limit ใช้ไม่ได้ และ acceptance ซ้ำให้ผลเดิม
- Verification self-approval และ duplicate decision ถูก reject
- Switching Workspace ไม่ reuse stale cache/data

### 20.2 Module and workflow

- Internship transitions เป็นไปตาม state machine และ concurrent approval ไม่ซ้ำ
- Advisor เห็นเฉพาะ `ASSIGNED`/`ORG_UNIT` scope ที่ได้รับ
- Form submission ผูก definition version ที่ถูกต้อง
- Evaluation score/comment disclosure เป็นไปตาม policy
- Document signed/download URL ใช้ข้าม Workspace ไม่ได้

### 20.3 Migration

- legacy user ทุกคน map ไป User + default membership ได้เพียงหนึ่งชุด
- legacy roles ทุกค่ามี explicit mapping หรือถูก quarantine เพื่อ review
- จำนวน/status ของ applications, logs, documents, evaluations และ signatures reconcile ได้
- sampled UI/API behavior ตรงกับ baseline ก่อน cutover
- rollback flag ใช้งานได้โดยไม่มี destructive schema reversal

### 20.4 Operational

- Audit ครบสำหรับ sensitive actions และไม่เก็บ secrets/raw sensitive payload
- Outbox retry ไม่สร้าง notification/decision ซ้ำ
- Authz cache invalidation หลัง suspension/role revoke อยู่ใน target latency ที่กำหนดก่อน launch
- Backup restore drill รักษา workspace relationships และ assets references

---

## 21. Decisions that must be confirmed before implementation

1. ผู้ใช้ทั่วไปสร้าง Workspace ได้เองหรือ platform/admin เป็นผู้ provision ใน MVP
2. Educational Workspace ใช้ registry ใด, matching keys อะไร และ fallback manual review อย่างไร
3. Student/personnel identifier unique ระดับ Workspace, campus หรือทั้ง institution
4. Membership หนึ่งรายการมีหลาย Member Type ได้ใน product UI ตั้งแต่ V1 หรือเก็บ capability ไว้ใน schemaก่อน
5. Required personal fields, purpose, legal basis และ retention ต่อ Workspace type
6. Workplace supervisor จะเข้าร่วม University Workspace หรือเชื่อมผ่าน Company Workspace ในระยะแรก
7. Existing role mapping และผู้ที่จะเป็น initial Workspace Owner/Admin
8. Data retention เมื่อ member leave, Workspace closes หรือ grant ถูกถอน
9. Audit retention, support access และ incident response ownership
10. Cutover threshold และ rollback window สำหรับ legacy system

---

## 22. Recommended implementation order

```text
1. Schema inventory + legacy mapping
2. Core Workspace/Membership/Profile model
3. Permission catalog + authorization context
4. Invitation and verification state machines
5. Audit/outbox/idempotency foundations
6. Workspace shell and switching UX
7. Migrate Internship onto membership/workspace references
8. Extract Documents, Forms, Evaluation boundaries
9. Shadow authorization + reconciliation
10. Cohort cutover, observability, then multi-workspace launch
```

ลำดับนี้ตั้งใจให้สิ่งที่เสี่ยงที่สุด—tenant isolation, authorization และ migration correctness—ถูกพิสูจน์ก่อนเปิด multi-workspace ต่อผู้ใช้จริง

---

## 23. Final architecture decision summary

- เลือก **multi-tenant modular monolith** บน stack เดิม แทน microservices
- ใช้ `WorkspaceMembership` เป็นแกนของ organization identity และ access
- แยก `MemberType` ออกจาก `Role`; Role รวม permissions และ scope
- แยก `PersonalProfile` ออกจาก `WorkspaceProfile` และกำกับ cross-boundary access ด้วย grants/purpose
- ใช้ explicit `workspace_id` + mandatory request/repository context สำหรับ tenant isolation
- ให้ Invitations เริ่ม join flow แต่ไม่ให้สิทธิ์โดยปริยาย
- ให้ Verification เป็น first-class workflow พร้อม evidence/decision/audit
- ทำ Internship, Documents, Forms และ Evaluation เป็น modules บน Core
- migrate แบบ additive, shadow, cohort cutover และ forward reconciliation โดย reuse PostgreSQL, Bun, Hono, Zod, Better Auth/LINE, Hono RPC, React และ shadcn/ui

เอกสารนี้เป็น target design; ก่อนเริ่ม migration จริงต้องเติม current schema inventory, role mapping, privacy/retention decisions และ operational SLO ที่อ้างอิงข้อมูล production จริง
