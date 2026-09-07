CREATE TABLE "student_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"address" text NOT NULL,
	"emergency_contact_name" text NOT NULL,
	"emergency_contact_relationship" text NOT NULL,
	"emergency_contact_phone" text NOT NULL,
	"blood_type" text NOT NULL,
	"medical_conditions" text NOT NULL,
	"allergies" text NOT NULL,
	"medications" text NOT NULL,
	"accessibility_needs" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;