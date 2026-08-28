import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const organizationType = pgEnum("organization_type", ["university", "company"]);

export const organizationStatus = pgEnum("organization_status", ["active", "inactive"]);

export const organizationRole = pgEnum("organization_role", [
  "university_admin",
  "coordinator",
  "advisor",
  "student",
  "company_admin",
  "supervisor",
]);

export const membershipStatus = pgEnum("membership_status", ["active", "suspended"]);

export const organization = pgTable(
  "organization",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: organizationType("type").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: organizationStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("organization_slug_uidx").on(table.slug)],
);

export const organizationMembership = pgTable(
  "organization_membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: organizationRole("role").notNull(),
    status: membershipStatus("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("organization_membership_org_user_uidx").on(table.organizationId, table.userId),
    index("organization_membership_user_idx").on(table.userId),
  ],
);

export const organizationRelations = relations(organization, ({ many }) => ({
  memberships: many(organizationMembership),
}));

export const organizationMembershipRelations = relations(organizationMembership, ({ one }) => ({
  organization: one(organization, {
    fields: [organizationMembership.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [organizationMembership.userId],
    references: [user.id],
  }),
}));
