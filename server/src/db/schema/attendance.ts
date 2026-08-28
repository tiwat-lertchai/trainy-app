import { relations, sql } from "drizzle-orm";
import { boolean, check, date, doublePrecision, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { placement } from "./placement";

export const locationPolicy = pgEnum("location_policy", ["disabled", "optional", "required_onsite"]);
export const attendanceStatus = pgEnum("attendance_status", ["checked_in", "complete", "late", "left_early", "late_and_left_early", "incomplete"]);
export const adjustmentStatus = pgEnum("attendance_adjustment_status", ["pending", "approved", "rejected"]);

export type LocationEvidence = { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string; insideGeofence: boolean | null };

export const placementWorkSchedule = pgTable("placement_work_schedule", {
  id: uuid("id").defaultRandom().primaryKey(),
  placementId: uuid("placement_id").notNull().references(() => placement.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  breakMinutes: integer("break_minutes").default(60).notNull(),
  graceMinutes: integer("grace_minutes").default(10).notNull(),
  timezone: text("timezone").default("Asia/Bangkok").notNull(),
  locationPolicy: locationPolicy("location_policy").default("optional").notNull(),
  geofenceLatitude: doublePrecision("geofence_latitude"),
  geofenceLongitude: doublePrecision("geofence_longitude"),
  geofenceRadiusMeters: integer("geofence_radius_meters"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("placement_work_schedule_day_uidx").on(table.placementId, table.weekday),
  check("placement_work_schedule_weekday", sql`${table.weekday} between 0 and 6`),
  check("placement_work_schedule_minutes", sql`${table.startMinute} between 0 and 1439 and ${table.endMinute} between 1 and 1440 and ${table.endMinute} > ${table.startMinute}`),
  check("placement_work_schedule_break", sql`${table.breakMinutes} >= 0 and ${table.graceMinutes} >= 0`),
]);

export const attendanceRecord = pgTable("attendance_record", {
  id: uuid("id").defaultRandom().primaryKey(),
  placementId: uuid("placement_id").notNull().references(() => placement.id, { onDelete: "cascade" }),
  studentUserId: text("student_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  workDate: date("work_date", { mode: "string" }).notNull(),
  scheduleId: uuid("schedule_id").references(() => placementWorkSchedule.id, { onDelete: "restrict" }),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull(),
  checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
  checkInLocation: jsonb("check_in_location").$type<LocationEvidence>(),
  checkOutLocation: jsonb("check_out_location").$type<LocationEvidence>(),
  locationExceptionReason: text("location_exception_reason"),
  netMinutes: integer("net_minutes"),
  status: attendanceStatus("status").default("checked_in").notNull(),
  studentNote: text("student_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [uniqueIndex("attendance_placement_date_uidx").on(table.placementId, table.workDate), index("attendance_student_date_idx").on(table.studentUserId, table.workDate)]);

export const attendanceAdjustmentRequest = pgTable("attendance_adjustment_request", {
  id: uuid("id").defaultRandom().primaryKey(),
  attendanceId: uuid("attendance_id").notNull().references(() => attendanceRecord.id, { onDelete: "cascade" }),
  requestedByUserId: text("requested_by_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  proposedCheckInAt: timestamp("proposed_check_in_at", { withTimezone: true }),
  proposedCheckOutAt: timestamp("proposed_check_out_at", { withTimezone: true }),
  reason: text("reason").notNull(),
  status: adjustmentStatus("status").default("pending").notNull(),
  reviewerUserId: text("reviewer_user_id").references(() => user.id, { onDelete: "restrict" }),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("attendance_adjustment_attendance_idx").on(table.attendanceId), index("attendance_adjustment_status_idx").on(table.status)]);

export const attendanceRecordRelations = relations(attendanceRecord, ({ one, many }) => ({ placement: one(placement, { fields: [attendanceRecord.placementId], references: [placement.id] }), schedule: one(placementWorkSchedule, { fields: [attendanceRecord.scheduleId], references: [placementWorkSchedule.id] }), adjustments: many(attendanceAdjustmentRequest) }));
export const attendanceAdjustmentRelations = relations(attendanceAdjustmentRequest, ({ one }) => ({ attendance: one(attendanceRecord, { fields: [attendanceAdjustmentRequest.attendanceId], references: [attendanceRecord.id] }) }));
