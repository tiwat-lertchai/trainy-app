CREATE TYPE "public"."document_status" AS ENUM('submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('resume', 'consent', 'progress_evidence', 'final_report', 'other');--> statement-breakpoint
CREATE TYPE "public"."evaluation_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."evaluator_type" AS ENUM('advisor', 'supervisor');--> statement-breakpoint
CREATE TABLE "placement_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"type" "document_type" NOT NULL,
	"file_name" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "document_status" DEFAULT 'submitted' NOT NULL,
	"reviewer_user_id" text,
	"feedback" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_document_size_range" CHECK ("placement_document"."size_bytes" > 0 and "placement_document"."size_bytes" <= 20971520)
);
--> statement-breakpoint
CREATE TABLE "placement_evaluation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"evaluator_user_id" text NOT NULL,
	"evaluator_type" "evaluator_type" NOT NULL,
	"technical_score" integer NOT NULL,
	"communication_score" integer NOT NULL,
	"responsibility_score" integer NOT NULL,
	"comment" text NOT NULL,
	"status" "evaluation_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_evaluation_score_range" CHECK ("placement_evaluation"."technical_score" between 1 and 5 and "placement_evaluation"."communication_score" between 1 and 5 and "placement_evaluation"."responsibility_score" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "placement_document" ADD CONSTRAINT "placement_document_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_document" ADD CONSTRAINT "placement_document_student_user_id_user_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_document" ADD CONSTRAINT "placement_document_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_evaluation" ADD CONSTRAINT "placement_evaluation_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_evaluation" ADD CONSTRAINT "placement_evaluation_evaluator_user_id_user_id_fk" FOREIGN KEY ("evaluator_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "placement_document_placement_idx" ON "placement_document" USING btree ("placement_id");--> statement-breakpoint
CREATE INDEX "placement_document_status_idx" ON "placement_document" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "placement_evaluation_type_uidx" ON "placement_evaluation" USING btree ("placement_id","evaluator_type");--> statement-breakpoint
CREATE INDEX "placement_evaluation_evaluator_idx" ON "placement_evaluation" USING btree ("evaluator_user_id");