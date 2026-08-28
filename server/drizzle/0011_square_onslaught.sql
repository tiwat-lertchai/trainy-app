CREATE TYPE "public"."internship_request_document_type" AS ENUM('cooperation_request_letter', 'referral_letter');--> statement-breakpoint
CREATE TYPE "public"."internship_request_status" AS ENUM('submitted', 'revision_requested', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."internship_request_step" AS ENUM('advisor', 'program_chair', 'center');--> statement-breakpoint
CREATE TYPE "public"."internship_request_step_decision" AS ENUM('pending', 'approved', 'rejected', 'revision_requested');--> statement-breakpoint
CREATE TYPE "public"."internship_request_type" AS ENUM('regular', 'cooperative');--> statement-breakpoint
CREATE TABLE "internship_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_user_id" text NOT NULL,
	"university_organization_id" uuid NOT NULL,
	"academic_major_id" uuid NOT NULL,
	"type" "internship_request_type" NOT NULL,
	"company_organization_id" uuid,
	"company_name_proposed" text,
	"company_contact_name" text,
	"company_contact_email" text,
	"company_contact_phone" text,
	"position_title" text NOT NULL,
	"description" text NOT NULL,
	"proposed_start_date" timestamp with time zone NOT NULL,
	"proposed_end_date" timestamp with time zone NOT NULL,
	"advisor_user_id" text NOT NULL,
	"status" "internship_request_status" DEFAULT 'submitted' NOT NULL,
	"revision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internship_request_date_order" CHECK ("internship_request"."proposed_end_date" > "internship_request"."proposed_start_date")
);
--> statement-breakpoint
CREATE TABLE "internship_request_approval" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"step" "internship_request_step" NOT NULL,
	"reviewer_user_id" text,
	"decision" "internship_request_step_decision" DEFAULT 'pending' NOT NULL,
	"note" text,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "internship_request_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"type" "internship_request_document_type" NOT NULL,
	"storage_key" text,
	"file_name" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE "student_academic_record" (
	"user_id" text PRIMARY KEY NOT NULL,
	"cumulative_gpa" numeric(3, 2),
	"last_term_gpa" numeric(3, 2),
	"meets_prerequisite" boolean,
	"updated_by_user_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "placement" ALTER COLUMN "application_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "placement" ALTER COLUMN "internship_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "academic_major" ADD COLUMN "program_chair_user_id" text;--> statement-breakpoint
ALTER TABLE "placement" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "internship_request" ADD CONSTRAINT "internship_request_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request" ADD CONSTRAINT "internship_request_university_organization_id_organization_id_fk" FOREIGN KEY ("university_organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request" ADD CONSTRAINT "internship_request_academic_major_id_academic_major_id_fk" FOREIGN KEY ("academic_major_id") REFERENCES "public"."academic_major"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request" ADD CONSTRAINT "internship_request_company_organization_id_organization_id_fk" FOREIGN KEY ("company_organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request" ADD CONSTRAINT "internship_request_advisor_user_id_user_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request_approval" ADD CONSTRAINT "internship_request_approval_request_id_internship_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."internship_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request_approval" ADD CONSTRAINT "internship_request_approval_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request_document" ADD CONSTRAINT "internship_request_document_request_id_internship_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."internship_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request_document" ADD CONSTRAINT "internship_request_document_generated_by_user_id_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_academic_record" ADD CONSTRAINT "student_academic_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_academic_record" ADD CONSTRAINT "student_academic_record_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "internship_request_student_idx" ON "internship_request" USING btree ("student_user_id");--> statement-breakpoint
CREATE INDEX "internship_request_university_idx" ON "internship_request" USING btree ("university_organization_id");--> statement-breakpoint
CREATE INDEX "internship_request_status_idx" ON "internship_request" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "internship_request_approval_request_step_uidx" ON "internship_request_approval" USING btree ("request_id","step");--> statement-breakpoint
CREATE UNIQUE INDEX "internship_request_document_request_type_uidx" ON "internship_request_document" USING btree ("request_id","type");--> statement-breakpoint
ALTER TABLE "academic_major" ADD CONSTRAINT "academic_major_program_chair_user_id_user_id_fk" FOREIGN KEY ("program_chair_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_request_id_internship_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."internship_request"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "placement_request_uidx" ON "placement" USING btree ("request_id");--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_origin_xor" CHECK (("placement"."application_id" is not null) <> ("placement"."request_id" is not null));