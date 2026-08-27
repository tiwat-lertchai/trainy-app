import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { placement } from "./placement";

export const documentType = pgEnum("document_type", [
  "resume",
  "consent",
  "progress_evidence",
  "final_report",
  "other",
]);
export const documentStatus = pgEnum("document_status", [
  "submitted",
  "approved",
  "rejected",
]);

export const placementDocument = pgTable(
  "placement_document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => placement.id, { onDelete: "cascade" }),
    studentUserId: text("student_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    type: documentType("type").notNull(),
    fileName: text("file_name").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: documentStatus("status").default("submitted").notNull(),
    reviewerUserId: text("reviewer_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    feedback: text("feedback"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "placement_document_size_range",
      sql`${table.sizeBytes} > 0 and ${table.sizeBytes} <= 20971520`,
    ),
    index("placement_document_placement_idx").on(table.placementId),
    index("placement_document_status_idx").on(table.status),
  ],
);

export const placementDocumentRelations = relations(
  placementDocument,
  ({ one }) => ({
    placement: one(placement, {
      fields: [placementDocument.placementId],
      references: [placement.id],
    }),
    student: one(user, {
      fields: [placementDocument.studentUserId],
      references: [user.id],
      relationName: "documentStudent",
    }),
    reviewer: one(user, {
      fields: [placementDocument.reviewerUserId],
      references: [user.id],
      relationName: "documentReviewer",
    }),
  }),
);
