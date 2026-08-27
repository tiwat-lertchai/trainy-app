CREATE TYPE "public"."placement_status" AS ENUM('pending', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "placement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"internship_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"university_organization_id" uuid NOT NULL,
	"company_organization_id" uuid NOT NULL,
	"advisor_user_id" text,
	"supervisor_user_id" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"status" "placement_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_date_order" CHECK ("placement"."end_date" > "placement"."start_date")
);
--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_application_id_internship_application_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."internship_application"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_internship_id_internship_id_fk" FOREIGN KEY ("internship_id") REFERENCES "public"."internship"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_university_organization_id_organization_id_fk" FOREIGN KEY ("university_organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_company_organization_id_organization_id_fk" FOREIGN KEY ("company_organization_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_advisor_user_id_user_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_supervisor_user_id_user_id_fk" FOREIGN KEY ("supervisor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "placement_application_uidx" ON "placement" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "placement_student_idx" ON "placement" USING btree ("student_user_id");--> statement-breakpoint
CREATE INDEX "placement_university_idx" ON "placement" USING btree ("university_organization_id");--> statement-breakpoint
CREATE INDEX "placement_company_idx" ON "placement" USING btree ("company_organization_id");--> statement-breakpoint
CREATE INDEX "placement_status_idx" ON "placement" USING btree ("status");