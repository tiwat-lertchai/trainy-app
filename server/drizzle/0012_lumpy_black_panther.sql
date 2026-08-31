ALTER TABLE "internship" ADD COLUMN "type" "internship_request_type" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
-- Existing postings predate track capture; regular is the deliberate legacy backfill.
ALTER TABLE "internship_application" ADD COLUMN "semester" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "internship_application" ADD COLUMN "academic_year" integer DEFAULT 2569 NOT NULL;--> statement-breakpoint
ALTER TABLE "internship_request" ADD COLUMN "semester" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "internship_request" ADD COLUMN "academic_year" integer DEFAULT 2569 NOT NULL;--> statement-breakpoint
ALTER TABLE "placement" ADD COLUMN "track" "internship_request_type" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "placement" ADD COLUMN "semester" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "placement" ADD COLUMN "academic_year" integer DEFAULT 2569 NOT NULL;--> statement-breakpoint
-- Preserve the originating request/application context for existing placements.
UPDATE "placement" AS p
SET
  "track" = COALESCE(r."type", i."type", 'regular'::"internship_request_type"),
  "semester" = COALESCE(r."semester", a."semester", 1),
  "academic_year" = COALESCE(r."academic_year", a."academic_year", 2569)
FROM "placement" AS source
LEFT JOIN "internship_request" AS r ON r."id" = source."request_id"
LEFT JOIN "internship_application" AS a ON a."id" = source."application_id"
LEFT JOIN "internship" AS i ON i."id" = source."internship_id"
WHERE p."id" = source."id";--> statement-breakpoint
ALTER TABLE "internship_application" ALTER COLUMN "semester" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "internship_application" ALTER COLUMN "academic_year" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "internship_request" ALTER COLUMN "semester" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "internship_request" ALTER COLUMN "academic_year" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "placement" ALTER COLUMN "track" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "placement" ALTER COLUMN "semester" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "placement" ALTER COLUMN "academic_year" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "internship_application" ADD CONSTRAINT "internship_application_semester_range" CHECK ("internship_application"."semester" between 1 and 3);--> statement-breakpoint
ALTER TABLE "internship_application" ADD CONSTRAINT "internship_application_academic_year_range" CHECK ("internship_application"."academic_year" between 2400 and 2800);--> statement-breakpoint
ALTER TABLE "internship_request" ADD CONSTRAINT "internship_request_semester_range" CHECK ("internship_request"."semester" between 1 and 3);--> statement-breakpoint
ALTER TABLE "internship_request" ADD CONSTRAINT "internship_request_academic_year_range" CHECK ("internship_request"."academic_year" between 2400 and 2800);--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_semester_range" CHECK ("placement"."semester" between 1 and 3);--> statement-breakpoint
ALTER TABLE "placement" ADD CONSTRAINT "placement_academic_year_range" CHECK ("placement"."academic_year" between 2400 and 2800);
