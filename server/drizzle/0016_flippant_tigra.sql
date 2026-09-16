CREATE TYPE "public"."internship_request_status_v2" AS ENUM('draft', 'submitted', 'revision_requested', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
ALTER TABLE "internship_request" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "internship_request" ALTER COLUMN "status" TYPE "public"."internship_request_status_v2" USING "status"::text::"public"."internship_request_status_v2";--> statement-breakpoint
DROP TYPE "public"."internship_request_status";--> statement-breakpoint
ALTER TYPE "public"."internship_request_status_v2" RENAME TO "internship_request_status";--> statement-breakpoint
CREATE TABLE "internship_request_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"version" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internship_request" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "internship_request" ADD COLUMN "company_contact_position" text;--> statement-breakpoint
ALTER TABLE "internship_request" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "internship_request" ADD COLUMN "submission_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "internship_request_submission" ADD CONSTRAINT "internship_request_submission_request_id_internship_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."internship_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_request_submission" ADD CONSTRAINT "internship_request_submission_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "internship_request_submission_actor_key_uidx" ON "internship_request_submission" USING btree ("actor_user_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "internship_request_submission_request_version_uidx" ON "internship_request_submission" USING btree ("request_id","version");
