CREATE TYPE "public"."onboarding_role" AS ENUM('student', 'advisor', 'coordinator', 'university_admin', 'company_admin', 'supervisor');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('pending', 'approved', 'rejected', 'revision_requested', 'cancelled');--> statement-breakpoint
CREATE TABLE "onboarding_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"requested_role" "onboarding_role" NOT NULL,
	"target_organization_id" uuid,
	"profile_data" jsonb NOT NULL,
	"proposed_organization" jsonb,
	"status" "onboarding_status" DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" text,
	"review_note" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_staff" (
	"user_id" text PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_request" ADD CONSTRAINT "onboarding_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_request" ADD CONSTRAINT "onboarding_request_target_organization_id_organization_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_request" ADD CONSTRAINT "onboarding_request_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "onboarding_request_user_uidx" ON "onboarding_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "onboarding_request_status_idx" ON "onboarding_request" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "onboarding_request_target_org_idx" ON "onboarding_request" USING btree ("target_organization_id");