ALTER TABLE "membership_member_type" DROP CONSTRAINT "membership_member_type_membership_id_organization_membership_id_fk";
--> statement-breakpoint
ALTER TABLE "membership_member_type" DROP CONSTRAINT "membership_member_type_member_type_id_organization_member_type_id_fk";
--> statement-breakpoint
ALTER TABLE "membership_role_assignment" DROP CONSTRAINT "membership_role_assignment_membership_id_organization_membership_id_fk";
--> statement-breakpoint
ALTER TABLE "membership_role_assignment" DROP CONSTRAINT "membership_role_assignment_role_id_access_role_id_fk";
--> statement-breakpoint
ALTER TABLE "membership_role_assignment" DROP CONSTRAINT "membership_role_assignment_granted_by_membership_id_organization_membership_id_fk";
--> statement-breakpoint
ALTER TABLE "verification_claim" DROP CONSTRAINT "verification_claim_membership_id_organization_membership_id_fk";
--> statement-breakpoint
ALTER TABLE "verification_claim" DROP CONSTRAINT "verification_claim_claimed_member_type_id_organization_member_type_id_fk";
--> statement-breakpoint
ALTER TABLE "verification_claim" DROP CONSTRAINT "verification_claim_decided_by_membership_id_organization_membership_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_profile" DROP CONSTRAINT "workspace_profile_membership_id_organization_membership_id_fk";
--> statement-breakpoint
ALTER TABLE "membership_member_type" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "membership_role_assignment" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_claim" ADD COLUMN "organization_id" uuid NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_membership_id_org_uidx" ON "organization_membership" USING btree ("id","organization_id");--> statement-breakpoint
ALTER TABLE "membership_member_type" ADD CONSTRAINT "membership_member_type_membership_org_fk" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."organization_membership"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_member_type" ADD CONSTRAINT "membership_member_type_type_org_fk" FOREIGN KEY ("member_type_id","organization_id") REFERENCES "public"."organization_member_type"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_role_assignment" ADD CONSTRAINT "membership_role_assignment_membership_org_fk" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."organization_membership"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_role_assignment" ADD CONSTRAINT "membership_role_assignment_role_org_fk" FOREIGN KEY ("role_id","organization_id") REFERENCES "public"."access_role"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_role_assignment" ADD CONSTRAINT "membership_role_assignment_granter_org_fk" FOREIGN KEY ("granted_by_membership_id","organization_id") REFERENCES "public"."organization_membership"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_claim" ADD CONSTRAINT "verification_claim_membership_org_fk" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."organization_membership"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_claim" ADD CONSTRAINT "verification_claim_type_org_fk" FOREIGN KEY ("claimed_member_type_id","organization_id") REFERENCES "public"."organization_member_type"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_claim" ADD CONSTRAINT "verification_claim_reviewer_org_fk" FOREIGN KEY ("decided_by_membership_id","organization_id") REFERENCES "public"."organization_membership"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_profile" ADD CONSTRAINT "workspace_profile_membership_org_fk" FOREIGN KEY ("membership_id","organization_id") REFERENCES "public"."organization_membership"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_member_type_one_primary_uidx" ON "membership_member_type" USING btree ("membership_id") WHERE "membership_member_type"."is_primary";--> statement-breakpoint
ALTER TABLE "verification_claim" ADD CONSTRAINT "verification_claim_no_self_review" CHECK ("verification_claim"."decided_by_membership_id" IS NULL OR "verification_claim"."decided_by_membership_id" <> "verification_claim"."membership_id");--> statement-breakpoint

-- Seed managed member types from organization templates. This classifies the
-- existing membership but does not assert that an identity was re-verified.
INSERT INTO "organization_member_type" ("organization_id", "key", "label", "is_managed")
SELECT "id", 'student', 'Student', true FROM "organization" WHERE "type" = 'university'
UNION ALL
SELECT "id", 'teacher', 'Teacher', true FROM "organization" WHERE "type" = 'university'
UNION ALL
SELECT "id", 'staff', 'Staff', true FROM "organization" WHERE "type" = 'university'
UNION ALL
SELECT "id", 'other', 'Other', true FROM "organization" WHERE "type" = 'university'
UNION ALL
SELECT "id", 'employee', 'Employee', true FROM "organization" WHERE "type" = 'company'
UNION ALL
SELECT "id", 'workplace_supervisor', 'Workplace Supervisor', true FROM "organization" WHERE "type" = 'company'
UNION ALL
SELECT "id", 'other', 'Other', true FROM "organization" WHERE "type" = 'company'
ON CONFLICT ("organization_id", "key") DO NOTHING;--> statement-breakpoint

INSERT INTO "membership_member_type" (
  "organization_id",
  "membership_id",
  "member_type_id",
  "is_primary",
  "source"
)
SELECT
  membership."organization_id",
  membership."id",
  member_type."id",
  true,
  'migration'::member_type_source
FROM "organization_membership" membership
JOIN "organization_member_type" member_type
  ON member_type."organization_id" = membership."organization_id"
 AND member_type."key" = CASE membership."role"
   WHEN 'student' THEN 'student'
   WHEN 'advisor' THEN 'teacher'
   WHEN 'coordinator' THEN 'staff'
   WHEN 'university_admin' THEN 'staff'
   WHEN 'company_admin' THEN 'employee'
   WHEN 'supervisor' THEN 'workplace_supervisor'
 END
ON CONFLICT ("membership_id", "member_type_id") DO NOTHING;--> statement-breakpoint

-- Mirror legacy roles into managed RBAC roles. The old role column remains the
-- enforcement source until shadow comparison and endpoint migration are done.
INSERT INTO "access_role" ("organization_id", "key", "name", "kind", "is_managed")
SELECT DISTINCT
  "organization_id",
  "role"::text,
  initcap(replace("role"::text, '_', ' ')),
  'system'::access_role_kind,
  true
FROM "organization_membership"
ON CONFLICT ("organization_id", "key") DO NOTHING;--> statement-breakpoint

INSERT INTO "access_permission" ("key", "module_key", "description") VALUES
  ('workspace.read', 'core', 'Read the current workspace'),
  ('workspace.settings.update', 'core', 'Update workspace settings'),
  ('membership.read', 'core', 'Read workspace memberships'),
  ('membership.invite', 'core', 'Create and revoke workspace invitations'),
  ('membership.review', 'core', 'Review membership verification claims'),
  ('membership.role.assign', 'core', 'Assign workspace roles'),
  ('profile.workspace.read.self', 'core', 'Read the current member workspace profile'),
  ('profile.workspace.update.self', 'core', 'Update editable fields on the current member workspace profile'),
  ('audit.read', 'core', 'Read workspace audit events')
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint

INSERT INTO "access_role_permission" ("role_id", "permission_key")
SELECT role."id", permission."key"
FROM "access_role" role
JOIN "access_permission" permission ON permission."key" IN (
  'workspace.read',
  'profile.workspace.read.self',
  'profile.workspace.update.self'
)
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "access_role_permission" ("role_id", "permission_key")
SELECT role."id", permission."key"
FROM "access_role" role
JOIN "access_permission" permission ON permission."key" IN (
  'workspace.settings.update',
  'membership.read',
  'membership.invite',
  'membership.review',
  'membership.role.assign',
  'audit.read'
)
WHERE role."key" IN ('university_admin', 'company_admin')
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "access_role_permission" ("role_id", "permission_key")
SELECT role."id", permission."key"
FROM "access_role" role
JOIN "access_permission" permission ON permission."key" IN (
  'membership.read',
  'membership.invite',
  'membership.review'
)
WHERE role."key" = 'coordinator'
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "membership_role_assignment" (
  "organization_id",
  "membership_id",
  "role_id",
  "scope_type"
)
SELECT
  membership."organization_id",
  membership."id",
  role."id",
  'workspace'::authorization_scope_type
FROM "organization_membership" membership
JOIN "access_role" role
  ON role."organization_id" = membership."organization_id"
 AND role."key" = membership."role"::text
ON CONFLICT DO NOTHING;--> statement-breakpoint

INSERT INTO "workspace_profile" (
  "organization_id",
  "membership_id",
  "display_name",
  "institutional_email",
  "source"
)
SELECT
  membership."organization_id",
  membership."id",
  account_user."name",
  account_user."email",
  'legacy_membership'
FROM "organization_membership" membership
JOIN "user" account_user ON account_user."id" = membership."user_id"
ON CONFLICT ("membership_id") DO NOTHING;
