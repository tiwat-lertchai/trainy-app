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

export const evaluatorType = pgEnum("evaluator_type", ["advisor", "supervisor"]);
export const evaluationStatus = pgEnum("evaluation_status", ["draft", "submitted"]);
export const placementEvaluation = pgTable(
  "placement_evaluation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => placement.id, { onDelete: "cascade" }),
    evaluatorUserId: text("evaluator_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    evaluatorType: evaluatorType("evaluator_type").notNull(),
    technicalScore: integer("technical_score").notNull(),
    communicationScore: integer("communication_score").notNull(),
    responsibilityScore: integer("responsibility_score").notNull(),
    comment: text("comment").notNull(),
    status: evaluationStatus("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "placement_evaluation_score_range",
      sql`${table.technicalScore} between 1 and 5 and ${table.communicationScore} between 1 and 5 and ${table.responsibilityScore} between 1 and 5`,
    ),
    uniqueIndex("placement_evaluation_type_uidx").on(table.placementId, table.evaluatorType),
    index("placement_evaluation_evaluator_idx").on(table.evaluatorUserId),
  ],
);
export const placementEvaluationRelations = relations(placementEvaluation, ({ one }) => ({
  placement: one(placement, {
    fields: [placementEvaluation.placementId],
    references: [placement.id],
  }),
  evaluator: one(user, {
    fields: [placementEvaluation.evaluatorUserId],
    references: [user.id],
  }),
}));
