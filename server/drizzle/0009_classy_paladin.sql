CREATE TABLE "academic_faculty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_major" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faculty_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_faculty" ADD CONSTRAINT "academic_faculty_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_major" ADD CONSTRAINT "academic_major_faculty_id_academic_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."academic_faculty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_faculty_org_name_uidx" ON "academic_faculty" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_major_faculty_name_uidx" ON "academic_major" USING btree ("faculty_id","name");