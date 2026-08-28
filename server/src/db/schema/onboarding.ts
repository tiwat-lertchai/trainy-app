import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization";

export const onboardingRole = pgEnum("onboarding_role", [
  "student", "advisor", "coordinator", "university_admin", "company_admin", "supervisor",
]);

export const onboardingStatus = pgEnum("onboarding_status", [
  "pending", "approved", "rejected", "revision_requested", "cancelled",
]);

export const platformStaff = pgTable("platform_staff", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const onboardingRequest = pgTable(
  "onboarding_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    requestedRole: onboardingRole("requested_role").notNull(),
    targetOrganizationId: uuid("target_organization_id").references(() => organization.id, { onDelete: "restrict" }),
    profileData: jsonb("profile_data").$type<Record<string, string>>().notNull(),
    proposedOrganization: jsonb("proposed_organization").$type<Record<string, string>>(),
    status: onboardingStatus("status").default("pending").notNull(),
    reviewerUserId: text("reviewer_user_id").references(() => user.id, { onDelete: "restrict" }),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex("onboarding_request_user_uidx").on(table.userId),
    index("onboarding_request_status_idx").on(table.status, table.submittedAt),
    index("onboarding_request_target_org_idx").on(table.targetOrganizationId),
  ],
);
