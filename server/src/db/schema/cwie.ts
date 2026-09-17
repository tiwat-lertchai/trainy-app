import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
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

export const cwieEntryType = pgEnum("cwie_entry_type", ["daily_log", "weekly_plan", "experience"]);
export const cwieWorkflowStatus = pgEnum("cwie_workflow_status", [
  "draft",
  "submitted",
  "revision_requested",
  "approved",
]);
export const cwieReviewDecision = pgEnum("cwie_review_decision", [
  "approved",
  "revision_requested",
]);
export const cwieVisitStatus = pgEnum("cwie_visit_status", ["scheduled", "completed", "cancelled"]);
export const cwieVisitMode = pgEnum("cwie_visit_mode", ["onsite", "online"]);

export const cwieEntry = pgTable(
  "cwie_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => placement.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    type: cwieEntryType("type").notNull(),
    workDate: date("work_date", { mode: "string" }),
    periodStart: date("period_start", { mode: "string" }),
    periodEnd: date("period_end", { mode: "string" }),
    weekNumber: integer("week_number"),
    activities: text("activities"),
    learning: text("learning"),
    problems: text("problems"),
    solutions: text("solutions"),
    outcomes: text("outcomes"),
    plannedTasks: text("planned_tasks"),
    actualTasks: text("actual_tasks"),
    plannedHours: integer("planned_hours"),
    hoursWorked: integer("hours_worked"),
    completionPercentage: integer("completion_percentage"),
    status: cwieWorkflowStatus("status").default("draft").notNull(),
    advisorDecision: cwieReviewDecision("advisor_decision"),
    advisorComment: text("advisor_comment"),
    advisorReviewedByUserId: text("advisor_reviewed_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    advisorReviewedAt: timestamp("advisor_reviewed_at", { withTimezone: true }),
    supervisorDecision: cwieReviewDecision("supervisor_decision"),
    supervisorComment: text("supervisor_comment"),
    supervisorReviewedByUserId: text("supervisor_reviewed_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    supervisorReviewedAt: timestamp("supervisor_reviewed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "cwie_entry_hours_range",
      sql`(${table.plannedHours} is null or ${table.plannedHours} between 0 and 168) and (${table.hoursWorked} is null or ${table.hoursWorked} between 0 and 168)`,
    ),
    check(
      "cwie_entry_completion_range",
      sql`${table.completionPercentage} is null or ${table.completionPercentage} between 0 and 100`,
    ),
    check(
      "cwie_entry_period_order",
      sql`${table.periodStart} is null or ${table.periodEnd} is null or ${table.periodEnd} >= ${table.periodStart}`,
    ),
    index("cwie_entry_placement_idx").on(table.placementId),
    index("cwie_entry_student_idx").on(table.studentUserId),
    index("cwie_entry_status_idx").on(table.status),
    uniqueIndex("cwie_entry_placement_type_date_uidx").on(
      table.placementId,
      table.type,
      table.workDate,
    ),
    uniqueIndex("cwie_entry_placement_type_period_uidx").on(
      table.placementId,
      table.type,
      table.periodStart,
    ),
  ],
);

export const cwieVisit = pgTable(
  "cwie_visit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => placement.id, { onDelete: "cascade" }),
    visitNumber: integer("visit_number").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    mode: cwieVisitMode("mode").notNull(),
    location: text("location"),
    notes: text("notes"),
    status: cwieVisitStatus("status").default("scheduled").notNull(),
    advisorUserId: text("advisor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    visitedAt: timestamp("visited_at", { withTimezone: true }),
    workObserved: text("work_observed"),
    studentProgress: text("student_progress"),
    issuesFound: text("issues_found"),
    solutionsAgreed: text("solutions_agreed"),
    recommendations: text("recommendations"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("cwie_visit_placement_number_uidx").on(table.placementId, table.visitNumber),
    check("cwie_visit_number_range", sql`${table.visitNumber} between 1 and 3`),
    check(
      "cwie_visit_onsite_location",
      sql`${table.mode} <> 'onsite' or ${table.location} is not null`,
    ),
    index("cwie_visit_placement_idx").on(table.placementId),
  ],
);

export const cwieMonthlySummary = pgTable(
  "cwie_monthly_summary",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => placement.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    month: date("month", { mode: "string" }).notNull(),
    summary: text("summary").notNull(),
    achievements: text("achievements").notNull(),
    challenges: text("challenges").notNull(),
    nextMonthPlan: text("next_month_plan").notNull(),
    totalHours: integer("total_hours").notNull(),
    status: cwieWorkflowStatus("status").default("draft").notNull(),
    advisorDecision: cwieReviewDecision("advisor_decision"),
    advisorComment: text("advisor_comment"),
    advisorReviewedByUserId: text("advisor_reviewed_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    advisorReviewedAt: timestamp("advisor_reviewed_at", { withTimezone: true }),
    supervisorDecision: cwieReviewDecision("supervisor_decision"),
    supervisorComment: text("supervisor_comment"),
    supervisorReviewedByUserId: text("supervisor_reviewed_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    supervisorReviewedAt: timestamp("supervisor_reviewed_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("cwie_monthly_summary_placement_month_uidx").on(table.placementId, table.month),
    check("cwie_monthly_summary_hours_range", sql`${table.totalHours} between 0 and 744`),
    index("cwie_monthly_summary_status_idx").on(table.status),
  ],
);

export const cwieEntryRelations = relations(cwieEntry, ({ one }) => ({
  placement: one(placement, { fields: [cwieEntry.placementId], references: [placement.id] }),
  student: one(user, {
    fields: [cwieEntry.studentUserId],
    references: [user.id],
    relationName: "cwieEntryStudent",
  }),
}));

export const cwieVisitRelations = relations(cwieVisit, ({ one }) => ({
  placement: one(placement, { fields: [cwieVisit.placementId], references: [placement.id] }),
  advisor: one(user, {
    fields: [cwieVisit.advisorUserId],
    references: [user.id],
    relationName: "cwieVisitAdvisor",
  }),
}));

export const cwieMonthlySummaryRelations = relations(cwieMonthlySummary, ({ one }) => ({
  placement: one(placement, {
    fields: [cwieMonthlySummary.placementId],
    references: [placement.id],
  }),
  student: one(user, {
    fields: [cwieMonthlySummary.studentUserId],
    references: [user.id],
    relationName: "cwieMonthlyStudent",
  }),
}));
