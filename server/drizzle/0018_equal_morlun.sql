CREATE TYPE "public"."cwie_entry_type" AS ENUM('daily_log', 'weekly_plan', 'experience');--> statement-breakpoint
CREATE TYPE "public"."cwie_review_decision" AS ENUM('approved', 'revision_requested');--> statement-breakpoint
CREATE TYPE "public"."cwie_visit_mode" AS ENUM('onsite', 'online');--> statement-breakpoint
CREATE TYPE "public"."cwie_visit_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cwie_workflow_status" AS ENUM('draft', 'submitted', 'revision_requested', 'approved');--> statement-breakpoint
CREATE TABLE "cwie_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"type" "cwie_entry_type" NOT NULL,
	"work_date" date,
	"period_start" date,
	"period_end" date,
	"week_number" integer,
	"activities" text,
	"learning" text,
	"problems" text,
	"solutions" text,
	"outcomes" text,
	"planned_tasks" text,
	"actual_tasks" text,
	"planned_hours" integer,
	"hours_worked" integer,
	"completion_percentage" integer,
	"status" "cwie_workflow_status" DEFAULT 'draft' NOT NULL,
	"advisor_decision" "cwie_review_decision",
	"advisor_comment" text,
	"advisor_reviewed_by_user_id" text,
	"advisor_reviewed_at" timestamp with time zone,
	"supervisor_decision" "cwie_review_decision",
	"supervisor_comment" text,
	"supervisor_reviewed_by_user_id" text,
	"supervisor_reviewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cwie_entry_hours_range" CHECK (("cwie_entry"."planned_hours" is null or "cwie_entry"."planned_hours" between 0 and 168) and ("cwie_entry"."hours_worked" is null or "cwie_entry"."hours_worked" between 0 and 168)),
	CONSTRAINT "cwie_entry_completion_range" CHECK ("cwie_entry"."completion_percentage" is null or "cwie_entry"."completion_percentage" between 0 and 100),
	CONSTRAINT "cwie_entry_period_order" CHECK ("cwie_entry"."period_start" is null or "cwie_entry"."period_end" is null or "cwie_entry"."period_end" >= "cwie_entry"."period_start")
);
--> statement-breakpoint
CREATE TABLE "cwie_monthly_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"month" date NOT NULL,
	"summary" text NOT NULL,
	"achievements" text NOT NULL,
	"challenges" text NOT NULL,
	"next_month_plan" text NOT NULL,
	"total_hours" integer NOT NULL,
	"status" "cwie_workflow_status" DEFAULT 'draft' NOT NULL,
	"advisor_decision" "cwie_review_decision",
	"advisor_comment" text,
	"advisor_reviewed_by_user_id" text,
	"advisor_reviewed_at" timestamp with time zone,
	"supervisor_decision" "cwie_review_decision",
	"supervisor_comment" text,
	"supervisor_reviewed_by_user_id" text,
	"supervisor_reviewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cwie_monthly_summary_hours_range" CHECK ("cwie_monthly_summary"."total_hours" between 0 and 744)
);
--> statement-breakpoint
CREATE TABLE "cwie_visit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"visit_number" integer NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"mode" "cwie_visit_mode" NOT NULL,
	"location" text,
	"notes" text,
	"status" "cwie_visit_status" DEFAULT 'scheduled' NOT NULL,
	"advisor_user_id" text NOT NULL,
	"visited_at" timestamp with time zone,
	"work_observed" text,
	"student_progress" text,
	"issues_found" text,
	"solutions_agreed" text,
	"recommendations" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cwie_visit_number_range" CHECK ("cwie_visit"."visit_number" between 1 and 3),
	CONSTRAINT "cwie_visit_onsite_location" CHECK ("cwie_visit"."mode" <> 'onsite' or "cwie_visit"."location" is not null)
);
--> statement-breakpoint
ALTER TABLE "cwie_entry" ADD CONSTRAINT "cwie_entry_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_entry" ADD CONSTRAINT "cwie_entry_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_entry" ADD CONSTRAINT "cwie_entry_advisor_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("advisor_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_entry" ADD CONSTRAINT "cwie_entry_supervisor_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("supervisor_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_monthly_summary" ADD CONSTRAINT "cwie_monthly_summary_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_monthly_summary" ADD CONSTRAINT "cwie_monthly_summary_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_monthly_summary" ADD CONSTRAINT "cwie_monthly_summary_advisor_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("advisor_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_monthly_summary" ADD CONSTRAINT "cwie_monthly_summary_supervisor_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("supervisor_reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_visit" ADD CONSTRAINT "cwie_visit_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cwie_visit" ADD CONSTRAINT "cwie_visit_advisor_user_id_user_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cwie_entry_placement_idx" ON "cwie_entry" USING btree ("placement_id");--> statement-breakpoint
CREATE INDEX "cwie_entry_student_idx" ON "cwie_entry" USING btree ("student_user_id");--> statement-breakpoint
CREATE INDEX "cwie_entry_status_idx" ON "cwie_entry" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cwie_entry_placement_type_date_uidx" ON "cwie_entry" USING btree ("placement_id","type","work_date");--> statement-breakpoint
CREATE UNIQUE INDEX "cwie_entry_placement_type_period_uidx" ON "cwie_entry" USING btree ("placement_id","type","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "cwie_monthly_summary_placement_month_uidx" ON "cwie_monthly_summary" USING btree ("placement_id","month");--> statement-breakpoint
CREATE INDEX "cwie_monthly_summary_status_idx" ON "cwie_monthly_summary" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cwie_visit_placement_number_uidx" ON "cwie_visit" USING btree ("placement_id","visit_number");--> statement-breakpoint
CREATE INDEX "cwie_visit_placement_idx" ON "cwie_visit" USING btree ("placement_id");