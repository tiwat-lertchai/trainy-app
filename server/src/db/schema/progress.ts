import { relations, sql } from "drizzle-orm";
import {
  check,
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
import { placement } from "./placement";

export const progressReportStatus = pgEnum("progress_report_status", [
  "draft",
  "submitted",
  "approved",
  "revision_requested",
]);

export const progressReport = pgTable(
  "progress_report",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => placement.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    summary: text("summary").notNull(),
    hoursWorked: integer("hours_worked").notNull(),
    status: progressReportStatus("status").default("draft").notNull(),
    reviewerUserId: text("reviewer_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    feedback: text("feedback"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check("progress_report_period_order", sql`${table.periodEnd} >= ${table.periodStart}`),
    check(
      "progress_report_hours_range",
      sql`${table.hoursWorked} >= 0 and ${table.hoursWorked} <= 744`,
    ),
    uniqueIndex("progress_report_placement_period_uidx").on(
      table.placementId,
      table.periodStart,
      table.periodEnd,
    ),
    index("progress_report_student_idx").on(table.studentUserId),
    index("progress_report_status_idx").on(table.status),
  ],
);

export const progressReportRelations = relations(progressReport, ({ one }) => ({
  placement: one(placement, {
    fields: [progressReport.placementId],
    references: [placement.id],
  }),
  student: one(user, {
    fields: [progressReport.studentUserId],
    references: [user.id],
    relationName: "progressStudent",
  }),
  reviewer: one(user, {
    fields: [progressReport.reviewerUserId],
    references: [user.id],
    relationName: "progressReviewer",
  }),
}));
