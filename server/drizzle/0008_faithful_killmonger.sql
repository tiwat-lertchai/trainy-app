CREATE TYPE "public"."attendance_adjustment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('checked_in', 'complete', 'late', 'left_early', 'late_and_left_early', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."location_policy" AS ENUM('disabled', 'optional', 'required_onsite');--> statement-breakpoint
CREATE TABLE "attendance_adjustment_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_id" uuid NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"proposed_check_in_at" timestamp with time zone,
	"proposed_check_out_at" timestamp with time zone,
	"reason" text NOT NULL,
	"status" "attendance_adjustment_status" DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"work_date" date NOT NULL,
	"schedule_id" uuid,
	"checked_in_at" timestamp with time zone NOT NULL,
	"checked_out_at" timestamp with time zone,
	"check_in_location" jsonb,
	"check_out_location" jsonb,
	"location_exception_reason" text,
	"net_minutes" integer,
	"status" "attendance_status" DEFAULT 'checked_in' NOT NULL,
	"student_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_work_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"break_minutes" integer DEFAULT 60 NOT NULL,
	"grace_minutes" integer DEFAULT 10 NOT NULL,
	"timezone" text DEFAULT 'Asia/Bangkok' NOT NULL,
	"location_policy" "location_policy" DEFAULT 'optional' NOT NULL,
	"geofence_latitude" double precision,
	"geofence_longitude" double precision,
	"geofence_radius_meters" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_work_schedule_weekday" CHECK ("placement_work_schedule"."weekday" between 0 and 6),
	CONSTRAINT "placement_work_schedule_minutes" CHECK ("placement_work_schedule"."start_minute" between 0 and 1439 and "placement_work_schedule"."end_minute" between 1 and 1440 and "placement_work_schedule"."end_minute" > "placement_work_schedule"."start_minute"),
	CONSTRAINT "placement_work_schedule_break" CHECK ("placement_work_schedule"."break_minutes" >= 0 and "placement_work_schedule"."grace_minutes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "attendance_adjustment_request" ADD CONSTRAINT "attendance_adjustment_request_attendance_id_attendance_record_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance_record"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustment_request" ADD CONSTRAINT "attendance_adjustment_request_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_adjustment_request" ADD CONSTRAINT "attendance_adjustment_request_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_record_schedule_id_placement_work_schedule_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."placement_work_schedule"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_work_schedule" ADD CONSTRAINT "placement_work_schedule_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_adjustment_attendance_idx" ON "attendance_adjustment_request" USING btree ("attendance_id");--> statement-breakpoint
CREATE INDEX "attendance_adjustment_status_idx" ON "attendance_adjustment_request" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_placement_date_uidx" ON "attendance_record" USING btree ("placement_id","work_date");--> statement-breakpoint
CREATE INDEX "attendance_student_date_idx" ON "attendance_record" USING btree ("student_user_id","work_date");--> statement-breakpoint
CREATE UNIQUE INDEX "placement_work_schedule_day_uidx" ON "placement_work_schedule" USING btree ("placement_id","weekday");