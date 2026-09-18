CREATE TYPE "public"."access_role_kind" AS ENUM('system', 'custom');--> statement-breakpoint
CREATE TYPE "public"."authorization_scope_type" AS ENUM('self', 'assigned', 'organization_unit', 'workspace');--> statement-breakpoint
CREATE TYPE "public"."member_type_source" AS ENUM('migration', 'self_claim', 'invitation', 'verification', 'administrator');--> statement-breakpoint
CREATE TYPE "public"."verification_claim_status" AS ENUM('draft', 'pending', 'needs_information', 'verified', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."verification_method" AS ENUM('registry_match', 'domain_email', 'invitation_attestation', 'manual_review', 'document_evidence', 'legacy_migration');--> statement-breakpoint
CREATE TYPE "public"."workspace_record_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "access_permission" (
	"key" text PRIMARY KEY NOT NULL,
	"module_key" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_role" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" "access_role_kind" NOT NULL,
	"is_managed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_role_permission" (
	"role_id" uuid NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "access_role_permission_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "membership_member_type" (
	"membership_id" uuid NOT NULL,
	"member_type_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"source" "member_type_source" NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_member_type_membership_id_member_type_id_pk" PRIMARY KEY("membership_id","member_type_id")
);
--> statement-breakpoint
CREATE TABLE "membership_role_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"scope_type" "authorization_scope_type" DEFAULT 'workspace' NOT NULL,
	"scope_ref_id" text,
	"granted_by_membership_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "membership_role_assignment_scope_ref" CHECK (("membership_role_assignment"."scope_type" = 'organization_unit' AND "membership_role_assignment"."scope_ref_id" IS NOT NULL) OR ("membership_role_assignment"."scope_type" <> 'organization_unit' AND "membership_role_assignment"."scope_ref_id" IS NULL)),
	CONSTRAINT "membership_role_assignment_expiry_order" CHECK ("membership_role_assignment"."expires_at" IS NULL OR "membership_role_assignment"."expires_at" > "membership_role_assignment"."granted_at")
);
--> statement-breakpoint
CREATE TABLE "organization_member_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"status" "workspace_record_status" DEFAULT 'active' NOT NULL,
	"is_managed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"membership_id" uuid NOT NULL,
	"claimed_member_type_id" uuid NOT NULL,
	"method" "verification_method" NOT NULL,
	"status" "verification_claim_status" DEFAULT 'draft' NOT NULL,
	"identifier_normalized" text,
	"evidence_ref" text,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_membership_id" uuid,
	"reason_code" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_claim_decision_fields" CHECK (("verification_claim"."status" IN ('verified', 'rejected') AND "verification_claim"."decided_at" IS NOT NULL) OR ("verification_claim"."status" NOT IN ('verified', 'rejected')))
);
--> statement-breakpoint
CREATE TABLE "workspace_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"display_name" text,
	"institutional_identifier" text,
	"institutional_email" text,
	"attributes" jsonb,
	"source" text NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_role" ADD CONSTRAINT "access_role_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_permission" ADD CONSTRAINT "access_role_permission_role_id_access_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."access_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_role_permission" ADD CONSTRAINT "access_role_permission_permission_key_access_permission_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."access_permission"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_member_type" ADD CONSTRAINT "membership_member_type_membership_id_organization_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_member_type" ADD CONSTRAINT "membership_member_type_member_type_id_organization_member_type_id_fk" FOREIGN KEY ("member_type_id") REFERENCES "public"."organization_member_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_role_assignment" ADD CONSTRAINT "membership_role_assignment_membership_id_organization_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_role_assignment" ADD CONSTRAINT "membership_role_assignment_role_id_access_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."access_role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_role_assignment" ADD CONSTRAINT "membership_role_assignment_granted_by_membership_id_organization_membership_id_fk" FOREIGN KEY ("granted_by_membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_type" ADD CONSTRAINT "organization_member_type_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_claim" ADD CONSTRAINT "verification_claim_membership_id_organization_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_claim" ADD CONSTRAINT "verification_claim_claimed_member_type_id_organization_member_type_id_fk" FOREIGN KEY ("claimed_member_type_id") REFERENCES "public"."organization_member_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_claim" ADD CONSTRAINT "verification_claim_decided_by_membership_id_organization_membership_id_fk" FOREIGN KEY ("decided_by_membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_profile" ADD CONSTRAINT "workspace_profile_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_profile" ADD CONSTRAINT "workspace_profile_membership_id_organization_membership_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."organization_membership"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_role_org_key_uidx" ON "access_role" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "access_role_id_org_uidx" ON "access_role" USING btree ("id","organization_id");--> statement-breakpoint
CREATE INDEX "membership_role_assignment_membership_idx" ON "membership_role_assignment" USING btree ("membership_id");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_role_assignment_unique_uidx" ON "membership_role_assignment" USING btree ("membership_id","role_id","scope_type","scope_ref_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_member_type_org_key_uidx" ON "organization_member_type" USING btree ("organization_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_member_type_id_org_uidx" ON "organization_member_type" USING btree ("id","organization_id");--> statement-breakpoint
CREATE INDEX "verification_claim_membership_status_idx" ON "verification_claim" USING btree ("membership_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_profile_membership_uidx" ON "workspace_profile" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "workspace_profile_org_identifier_idx" ON "workspace_profile" USING btree ("organization_id","institutional_identifier");