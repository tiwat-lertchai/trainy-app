import { date, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Health and self-reported academic fields are intentionally isolated from
// applications and review-list payloads. Only the owning student can read or
// update this record.
export const studentProfile = pgTable("student_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  address: text("address").notNull(),
  cumulativeGpa: numeric("cumulative_gpa", { precision: 3, scale: 2 }),
  lastTermGpa: numeric("last_term_gpa", { precision: 3, scale: 2 }),
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactRelationship: text("emergency_contact_relationship").notNull(),
  emergencyContactPhone: text("emergency_contact_phone").notNull(),
  bloodType: text("blood_type").notNull(),
  medicalConditions: text("medical_conditions").notNull(),
  allergies: text("allergies").notNull(),
  medications: text("medications").notNull(),
  accessibilityNeeds: text("accessibility_needs").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
