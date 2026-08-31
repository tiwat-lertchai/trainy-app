ALTER TYPE "public"."evaluator_type" ADD VALUE 'center_head';--> statement-breakpoint
ALTER TYPE "public"."evaluator_type" ADD VALUE 'program_committee';--> statement-breakpoint
CREATE TABLE "evaluation_component" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scheme_id" uuid NOT NULL,
	"evaluator_type" "evaluator_type" NOT NULL,
	"label" text NOT NULL,
	"max_score" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "evaluation_component_max_score_positive" CHECK ("evaluation_component"."max_score" > 0)
);
--> statement-breakpoint
CREATE TABLE "evaluation_criterion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"label" text NOT NULL,
	"max_score" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "evaluation_criterion_max_score_positive" CHECK ("evaluation_criterion"."max_score" > 0)
);
--> statement-breakpoint
CREATE TABLE "evaluation_criterion_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" integer NOT NULL,
	CONSTRAINT "evaluation_criterion_score_nonnegative" CHECK ("evaluation_criterion_score"."score" >= 0)
);
--> statement-breakpoint
CREATE TABLE "evaluation_scheme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_organization_id" uuid NOT NULL,
	"track" "internship_request_type" NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluation_scheme_active_flag" CHECK ("evaluation_scheme"."is_active" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE "evaluation_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"evaluator_user_id" text NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"status" "evaluation_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluation_component" ADD CONSTRAINT "evaluation_component_scheme_id_evaluation_scheme_id_fk" FOREIGN KEY ("scheme_id") REFERENCES "public"."evaluation_scheme"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_criterion" ADD CONSTRAINT "evaluation_criterion_component_id_evaluation_component_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."evaluation_component"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_criterion_score" ADD CONSTRAINT "evaluation_criterion_score_submission_id_evaluation_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."evaluation_submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_criterion_score" ADD CONSTRAINT "evaluation_criterion_score_criterion_id_evaluation_criterion_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."evaluation_criterion"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_scheme" ADD CONSTRAINT "evaluation_scheme_university_organization_id_organization_id_fk" FOREIGN KEY ("university_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_submission" ADD CONSTRAINT "evaluation_submission_placement_id_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_submission" ADD CONSTRAINT "evaluation_submission_component_id_evaluation_component_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."evaluation_component"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_submission" ADD CONSTRAINT "evaluation_submission_evaluator_user_id_user_id_fk" FOREIGN KEY ("evaluator_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_component_type_uidx" ON "evaluation_component" USING btree ("scheme_id","evaluator_type");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_criterion_order_uidx" ON "evaluation_criterion" USING btree ("component_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_criterion_score_uidx" ON "evaluation_criterion_score" USING btree ("submission_id","criterion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_scheme_version_uidx" ON "evaluation_scheme" USING btree ("university_organization_id","track","version");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_submission_component_uidx" ON "evaluation_submission" USING btree ("placement_id","component_id");--> statement-breakpoint
CREATE INDEX "evaluation_submission_evaluator_idx" ON "evaluation_submission" USING btree ("evaluator_user_id");