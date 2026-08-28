import { relations, sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { organization } from "./organization";

export const internshipStatus = pgEnum("internship_status", ["draft", "published", "closed"]);

export const internshipWorkMode = pgEnum("internship_work_mode", ["onsite", "hybrid", "remote"]);

export const applicationStatus = pgEnum("application_status", [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "withdrawn",
]);

export const internship = pgTable(
  "internship",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyOrganizationId: uuid("company_organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    location: text("location").notNull(),
    workMode: internshipWorkMode("work_mode").notNull(),
    capacity: integer("capacity").notNull(),
    applicationDeadline: timestamp("application_deadline", {
      withTimezone: true,
    }).notNull(),
    status: internshipStatus("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("internship_capacity_positive", sql`${table.capacity} > 0`),
    index("internship_company_idx").on(table.companyOrganizationId),
    index("internship_status_deadline_idx").on(table.status, table.applicationDeadline),
  ],
);

export const internshipApplication = pgTable(
  "internship_application",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    internshipId: uuid("internship_id")
      .notNull()
      .references(() => internship.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    universityOrganizationId: uuid("university_organization_id").notNull(),
    statement: text("statement").notNull(),
    status: applicationStatus("status").default("submitted").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "internship_app_university_fk",
      columns: [table.universityOrganizationId],
      foreignColumns: [organization.id],
    }).onDelete("restrict"),
    uniqueIndex("internship_application_internship_student_uidx").on(
      table.internshipId,
      table.studentUserId,
    ),
    index("internship_application_student_idx").on(table.studentUserId),
    index("internship_application_university_idx").on(table.universityOrganizationId),
    index("internship_application_status_idx").on(table.status),
  ],
);

export const internshipRelations = relations(internship, ({ one, many }) => ({
  company: one(organization, {
    fields: [internship.companyOrganizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [internship.createdByUserId],
    references: [user.id],
  }),
  applications: many(internshipApplication),
}));

export const internshipApplicationRelations = relations(internshipApplication, ({ one }) => ({
  internship: one(internship, {
    fields: [internshipApplication.internshipId],
    references: [internship.id],
  }),
  student: one(user, {
    fields: [internshipApplication.studentUserId],
    references: [user.id],
  }),
  university: one(organization, {
    fields: [internshipApplication.universityOrganizationId],
    references: [organization.id],
  }),
}));
