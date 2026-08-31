CREATE TABLE "attendance_leave_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"requested_by_user_id" text NOT NULL,
	"leave_date" date NOT NULL,
	"reason" text NOT NULL,
	"status" "attendance_adjustment_status" DEFAULT 'pending' NOT NULL,
	"reviewer_user_id" text,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_record" ADD COLUMN "offsite_destination" text;--> statement-breakpoint
ALTER TABLE "attendance_leave_request" ADD CONSTRAINT "attendance_leave_request_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_leave_request" ADD CONSTRAINT "attendance_leave_request_requested_by_user_id_user_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_leave_request" ADD CONSTRAINT "attendance_leave_request_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_leave_placement_date_uidx" ON "attendance_leave_request" USING btree ("placement_id","leave_date");--> statement-breakpoint
CREATE INDEX "attendance_leave_status_idx" ON "attendance_leave_request" USING btree ("status");--> statement-breakpoint
ALTER TABLE "attendance_record" ADD CONSTRAINT "attendance_offsite_reason_required" CHECK ("attendance_record"."offsite_destination" is null or "attendance_record"."location_exception_reason" is not null);