CREATE TYPE "public"."progress_report_status" AS ENUM('draft', 'submitted', 'approved', 'revision_requested');--> statement-breakpoint
CREATE TABLE "progress_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"summary" text NOT NULL,
	"hours_worked" integer NOT NULL,
	"status" "progress_report_status" DEFAULT 'draft' NOT NULL,
	"reviewer_user_id" text,
	"feedback" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_report_period_order" CHECK ("progress_report"."period_end" >= "progress_report"."period_start"),
	CONSTRAINT "progress_report_hours_range" CHECK ("progress_report"."hours_worked" >= 0 and "progress_report"."hours_worked" <= 744)
);
--> statement-breakpoint
ALTER TABLE "progress_report" ADD CONSTRAINT "progress_report_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_report" ADD CONSTRAINT "progress_report_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_report" ADD CONSTRAINT "progress_report_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "progress_report_placement_period_uidx" ON "progress_report" USING btree ("placement_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX "progress_report_student_idx" ON "progress_report" USING btree ("student_user_id");--> statement-breakpoint
CREATE INDEX "progress_report_status_idx" ON "progress_report" USING btree ("status");