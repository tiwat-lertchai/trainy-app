ALTER TABLE "membership_role_assignment" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
WITH "primary_assignment" AS (
	SELECT DISTINCT ON ("membership_id") "id"
	FROM "membership_role_assignment"
	ORDER BY "membership_id", ("scope_type" = 'workspace') DESC, "granted_at", "id"
)
UPDATE "membership_role_assignment"
SET "is_primary" = true
FROM "primary_assignment"
WHERE "membership_role_assignment"."id" = "primary_assignment"."id";--> statement-breakpoint
CREATE UNIQUE INDEX "membership_role_assignment_one_primary_uidx" ON "membership_role_assignment" USING btree ("membership_id") WHERE "membership_role_assignment"."is_primary";--> statement-breakpoint
ALTER TABLE "organization_membership" DROP COLUMN "role";--> statement-breakpoint
DROP TYPE "public"."organization_role";
