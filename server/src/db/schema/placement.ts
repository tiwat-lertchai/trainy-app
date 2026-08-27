import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { internship, internshipApplication } from "./internship";
import { organization } from "./organization";

export const placementStatus = pgEnum("placement_status", [
  "pending",
  "active",
  "completed",
  "cancelled",
]);

export const placement = pgTable(
  "placement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => internshipApplication.id, { onDelete: "restrict" }),
    internshipId: uuid("internship_id")
      .notNull()
      .references(() => internship.id, { onDelete: "restrict" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    universityOrganizationId: uuid("university_organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    companyOrganizationId: uuid("company_organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    advisorUserId: text("advisor_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    supervisorUserId: text("supervisor_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    status: placementStatus("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("placement_date_order", sql`${table.endDate} > ${table.startDate}`),
    uniqueIndex("placement_application_uidx").on(table.applicationId),
    index("placement_student_idx").on(table.studentUserId),
    index("placement_university_idx").on(table.universityOrganizationId),
    index("placement_company_idx").on(table.companyOrganizationId),
    index("placement_status_idx").on(table.status),
  ],
);

export const placementRelations = relations(placement, ({ one }) => ({
  application: one(internshipApplication, {
    fields: [placement.applicationId],
    references: [internshipApplication.id],
  }),
  internship: one(internship, {
    fields: [placement.internshipId],
    references: [internship.id],
  }),
  student: one(user, {
    fields: [placement.studentUserId],
    references: [user.id],
    relationName: "placementStudent",
  }),
  advisor: one(user, {
    fields: [placement.advisorUserId],
    references: [user.id],
    relationName: "placementAdvisor",
  }),
  supervisor: one(user, {
    fields: [placement.supervisorUserId],
    references: [user.id],
    relationName: "placementSupervisor",
  }),
}));
