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
import { academicMajor } from "./academic";
import { organization } from "./organization";

export const internshipRequestType = pgEnum("internship_request_type", ["regular", "cooperative"]);

export const internshipRequestStatus = pgEnum("internship_request_status", [
  "submitted",
  "revision_requested",
  "approved",
  "rejected",
  "cancelled",
]);

export const internshipRequestStep = pgEnum("internship_request_step", [
  "advisor",
  "program_chair",
  "center",
]);

export const internshipRequestStepDecision = pgEnum("internship_request_step_decision", [
  "pending",
  "approved",
  "rejected",
  "revision_requested",
]);

export const internshipRequestDocumentType = pgEnum("internship_request_document_type", [
  "cooperation_request_letter",
  "referral_letter",
]);

export const internshipRequest = pgTable(
  "internship_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    universityOrganizationId: uuid("university_organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    academicMajorId: uuid("academic_major_id")
      .notNull()
      .references(() => academicMajor.id, { onDelete: "restrict" }),
    type: internshipRequestType("type").notNull(),
    semester: integer("semester").notNull(),
    academicYear: integer("academic_year").notNull(),
    // Set once the company exists in the system (already present, or joined
    // later through an invite). Until then, the student's own description of
    // who they found is kept in the proposed* fields below.
    companyOrganizationId: uuid("company_organization_id").references(() => organization.id, {
      onDelete: "restrict",
    }),
    companyNameProposed: text("company_name_proposed"),
    companyContactName: text("company_contact_name"),
    companyContactEmail: text("company_contact_email"),
    companyContactPhone: text("company_contact_phone"),
    positionTitle: text("position_title").notNull(),
    description: text("description").notNull(),
    proposedStartDate: timestamp("proposed_start_date", { withTimezone: true }).notNull(),
    proposedEndDate: timestamp("proposed_end_date", { withTimezone: true }).notNull(),
    advisorUserId: text("advisor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: internshipRequestStatus("status").default("submitted").notNull(),
    revisionNote: text("revision_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "internship_request_date_order",
      sql`${table.proposedEndDate} > ${table.proposedStartDate}`,
    ),
    check("internship_request_semester_range", sql`${table.semester} between 1 and 3`),
    check(
      "internship_request_academic_year_range",
      sql`${table.academicYear} between 2400 and 2800`,
    ),
    index("internship_request_student_idx").on(table.studentUserId),
    index("internship_request_university_idx").on(table.universityOrganizationId),
    index("internship_request_status_idx").on(table.status),
  ],
);

export const internshipRequestApproval = pgTable(
  "internship_request_approval",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => internshipRequest.id, { onDelete: "cascade" }),
    step: internshipRequestStep("step").notNull(),
    // Null until claimed for the "center" step — advisor/program_chair are
    // resolved to a specific person up front, center is "any qualified
    // university staff", set to whoever actually decides.
    reviewerUserId: text("reviewer_user_id").references(() => user.id, { onDelete: "restrict" }),
    decision: internshipRequestStepDecision("decision").default("pending").notNull(),
    note: text("note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("internship_request_approval_request_step_uidx").on(table.requestId, table.step),
  ],
);

export const internshipRequestDocument = pgTable(
  "internship_request_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => internshipRequest.id, { onDelete: "cascade" }),
    type: internshipRequestDocumentType("type").notNull(),
    // Null until a follow-up feature actually generates the file content —
    // see summarize/ for the v1 scoping decision on this.
    storageKey: text("storage_key"),
    fileName: text("file_name"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    generatedByUserId: text("generated_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [
    uniqueIndex("internship_request_document_request_type_uidx").on(table.requestId, table.type),
  ],
);

export const internshipRequestRelations = relations(internshipRequest, ({ one, many }) => ({
  student: one(user, {
    fields: [internshipRequest.studentUserId],
    references: [user.id],
    relationName: "internshipRequestStudent",
  }),
  university: one(organization, {
    fields: [internshipRequest.universityOrganizationId],
    references: [organization.id],
    relationName: "internshipRequestUniversity",
  }),
  company: one(organization, {
    fields: [internshipRequest.companyOrganizationId],
    references: [organization.id],
    relationName: "internshipRequestCompany",
  }),
  academicMajor: one(academicMajor, {
    fields: [internshipRequest.academicMajorId],
    references: [academicMajor.id],
  }),
  advisor: one(user, {
    fields: [internshipRequest.advisorUserId],
    references: [user.id],
    relationName: "internshipRequestAdvisor",
  }),
  approvals: many(internshipRequestApproval),
  documents: many(internshipRequestDocument),
}));

export const internshipRequestApprovalRelations = relations(
  internshipRequestApproval,
  ({ one }) => ({
    request: one(internshipRequest, {
      fields: [internshipRequestApproval.requestId],
      references: [internshipRequest.id],
    }),
    reviewer: one(user, {
      fields: [internshipRequestApproval.reviewerUserId],
      references: [user.id],
    }),
  }),
);

export const internshipRequestDocumentRelations = relations(
  internshipRequestDocument,
  ({ one }) => ({
    request: one(internshipRequest, {
      fields: [internshipRequestDocument.requestId],
      references: [internshipRequest.id],
    }),
    generatedBy: one(user, {
      fields: [internshipRequestDocument.generatedByUserId],
      references: [user.id],
    }),
  }),
);
