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
import { internshipRequest } from "./internship-request";
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
    // Exactly one origin: the job-board path (applicationId + internshipId,
    // both set together) or the self-sourced request path (requestId only).
    applicationId: uuid("application_id").references(() => internshipApplication.id, {
      onDelete: "restrict",
    }),
    internshipId: uuid("internship_id").references(() => internship.id, { onDelete: "restrict" }),
    requestId: uuid("request_id").references(() => internshipRequest.id, {
      onDelete: "restrict",
    }),
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("placement_date_order", sql`${table.endDate} > ${table.startDate}`),
    check(
      "placement_origin_xor",
      sql`(${table.applicationId} is not null) <> (${table.requestId} is not null)`,
    ),
    uniqueIndex("placement_application_uidx").on(table.applicationId),
    uniqueIndex("placement_request_uidx").on(table.requestId),
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
  request: one(internshipRequest, {
    fields: [placement.requestId],
    references: [internshipRequest.id],
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
