import { date, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Health fields are intentionally isolated from applications and review-list
// payloads. Only the owning student can read or update this record.
export const studentProfile = pgTable("student_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  address: text("address").notNull(),
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
