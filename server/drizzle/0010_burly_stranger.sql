CREATE TYPE "public"."invite_role" AS ENUM('company_admin', 'supervisor');--> statement-breakpoint
CREATE TABLE "organization_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"inviter_user_id" text NOT NULL,
	"inviter_organization_id" uuid NOT NULL,
	"role" "invite_role" NOT NULL,
	"target_organization_id" uuid,
	"proposed_organization_name" text,
	"expires_at" timestamp with time zone NOT NULL,
	"redeemed_at" timestamp with time zone,
	"redeemed_by_user_id" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invite_target_xor_proposed" CHECK (("organization_invite"."target_organization_id" is not null) <> ("organization_invite"."proposed_organization_name" is not null))
);
--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_inviter_user_id_user_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_inviter_organization_id_organization_id_fk" FOREIGN KEY ("inviter_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_target_organization_id_organization_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invite" ADD CONSTRAINT "organization_invite_redeemed_by_user_id_user_id_fk" FOREIGN KEY ("redeemed_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_invite_token_uidx" ON "organization_invite" USING btree ("token");--> statement-breakpoint
CREATE INDEX "organization_invite_inviter_org_idx" ON "organization_invite" USING btree ("inviter_organization_id");