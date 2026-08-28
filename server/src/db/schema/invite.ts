import { relations, sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization";

// Only these two roles can be granted through an invite — a company hasn't
// signed up on its own, so the university vouches for exactly who gets in.
export const inviteRole = pgEnum("invite_role", ["company_admin", "supervisor"]);

export const organizationInvite = pgTable(
  "organization_invite",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: text("token").notNull(),
    inviterUserId: text("inviter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    inviterOrganizationId: uuid("inviter_organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: inviteRole("role").notNull(),
    // Exactly one of these two is set: invite into an existing company, or
    // bootstrap a brand new one (same idea as onboardingRequest.proposedOrganization).
    targetOrganizationId: uuid("target_organization_id").references(() => organization.id, {
      onDelete: "cascade",
    }),
    proposedOrganizationName: text("proposed_organization_name"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    redeemedByUserId: text("redeemed_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_invite_token_uidx").on(table.token),
    index("organization_invite_inviter_org_idx").on(table.inviterOrganizationId),
    check(
      "organization_invite_target_xor_proposed",
      sql`(${table.targetOrganizationId} is not null) <> (${table.proposedOrganizationName} is not null)`,
    ),
  ],
);

export const organizationInviteRelations = relations(organizationInvite, ({ one }) => ({
  inviter: one(user, {
    fields: [organizationInvite.inviterUserId],
    references: [user.id],
    relationName: "inviteInviter",
  }),
  inviterOrganization: one(organization, {
    fields: [organizationInvite.inviterOrganizationId],
    references: [organization.id],
    relationName: "inviteInviterOrganization",
  }),
  targetOrganization: one(organization, {
    fields: [organizationInvite.targetOrganizationId],
    references: [organization.id],
    relationName: "inviteTargetOrganization",
  }),
  redeemedBy: one(user, {
    fields: [organizationInvite.redeemedByUserId],
    references: [user.id],
    relationName: "inviteRedeemedBy",
  }),
}));
