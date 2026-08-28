import { boolean, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";

// Manually maintained by university staff — there is no SIS integration.
// Surfaced to the internship request center-review step as information for
// a human judgment call, never enforced as a hard block by application code.
export const studentAcademicRecord = pgTable("student_academic_record", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  cumulativeGpa: numeric("cumulative_gpa", { precision: 3, scale: 2 }),
  lastTermGpa: numeric("last_term_gpa", { precision: 3, scale: 2 }),
  meetsPrerequisite: boolean("meets_prerequisite"),
  updatedByUserId: text("updated_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const studentAcademicRecordRelations = relations(studentAcademicRecord, ({ one }) => ({
  student: one(user, {
    fields: [studentAcademicRecord.userId],
    references: [user.id],
    relationName: "academicRecordStudent",
  }),
  updatedBy: one(user, {
    fields: [studentAcademicRecord.updatedByUserId],
    references: [user.id],
    relationName: "academicRecordUpdatedBy",
  }),
}));
