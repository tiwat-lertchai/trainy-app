import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organization } from "./organization";

export const academicFaculty = pgTable(
  "academic_faculty",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("academic_faculty_org_name_uidx").on(table.organizationId, table.name)],
);

export const academicMajor = pgTable(
  "academic_major",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => academicFaculty.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("academic_major_faculty_name_uidx").on(table.facultyId, table.name)],
);

export const academicFacultyRelations = relations(academicFaculty, ({ one, many }) => ({
  organization: one(organization, {
    fields: [academicFaculty.organizationId],
    references: [organization.id],
  }),
  majors: many(academicMajor),
}));

export const academicMajorRelations = relations(academicMajor, ({ one }) => ({
  faculty: one(academicFaculty, {
    fields: [academicMajor.facultyId],
    references: [academicFaculty.id],
  }),
}));
