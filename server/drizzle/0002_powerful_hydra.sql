CREATE TYPE "public"."application_status" AS ENUM('submitted', 'under_review', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."internship_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."internship_work_mode" AS ENUM('onsite', 'hybrid', 'remote');--> statement-breakpoint
CREATE TABLE "internship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_organization_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"work_mode" "internship_work_mode" NOT NULL,
	"capacity" integer NOT NULL,
	"application_deadline" timestamp with time zone NOT NULL,
	"status" "internship_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internship_capacity_positive" CHECK ("internship"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "internship_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internship_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"university_organization_id" uuid NOT NULL,
	"statement" text NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internship" ADD CONSTRAINT "internship_company_organization_id_organization_id_fk" FOREIGN KEY ("company_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship" ADD CONSTRAINT "internship_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_application" ADD CONSTRAINT "internship_application_internship_id_internship_id_fk" FOREIGN KEY ("internship_id") REFERENCES "public"."internship"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_application" ADD CONSTRAINT "internship_application_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_application" ADD CONSTRAINT "internship_app_university_fk" FOREIGN KEY ("university_organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "internship_company_idx" ON "internship" USING btree ("company_organization_id");--> statement-breakpoint
CREATE INDEX "internship_status_deadline_idx" ON "internship" USING btree ("status","application_deadline");--> statement-breakpoint
CREATE UNIQUE INDEX "internship_application_internship_student_uidx" ON "internship_application" USING btree ("internship_id","student_user_id");--> statement-breakpoint
CREATE INDEX "internship_application_student_idx" ON "internship_application" USING btree ("student_user_id");--> statement-breakpoint
CREATE INDEX "internship_application_university_idx" ON "internship_application" USING btree ("university_organization_id");--> statement-breakpoint
CREATE INDEX "internship_application_status_idx" ON "internship_application" USING btree ("status");