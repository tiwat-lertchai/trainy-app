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
import { organization } from "./organization";
import { internshipRequestType } from "./internship-request";
import { placement } from "./placement";

export const evaluatorType = pgEnum("evaluator_type", [
  "advisor",
  "supervisor",
  "center_head",
  "program_committee",
]);
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

export const evaluationScheme = pgTable(
  "evaluation_scheme",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    universityOrganizationId: uuid("university_organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    track: internshipRequestType("track").notNull(),
    name: text("name").notNull(),
    version: integer("version").default(1).notNull(),
    isActive: integer("is_active").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("evaluation_scheme_active_flag", sql`${table.isActive} in (0, 1)`),
    uniqueIndex("evaluation_scheme_version_uidx").on(
      table.universityOrganizationId,
      table.track,
      table.version,
    ),
  ],
);

export const evaluationComponent = pgTable(
  "evaluation_component",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schemeId: uuid("scheme_id")
      .notNull()
      .references(() => evaluationScheme.id, { onDelete: "cascade" }),
    evaluatorType: evaluatorType("evaluator_type").notNull(),
    label: text("label").notNull(),
    maxScore: integer("max_score").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    check("evaluation_component_max_score_positive", sql`${table.maxScore} > 0`),
    uniqueIndex("evaluation_component_type_uidx").on(table.schemeId, table.evaluatorType),
  ],
);

export const evaluationCriterion = pgTable(
  "evaluation_criterion",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    componentId: uuid("component_id")
      .notNull()
      .references(() => evaluationComponent.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    maxScore: integer("max_score").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [
    check("evaluation_criterion_max_score_positive", sql`${table.maxScore} > 0`),
    uniqueIndex("evaluation_criterion_order_uidx").on(table.componentId, table.sortOrder),
  ],
);

export const evaluationSubmission = pgTable(
  "evaluation_submission",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementId: uuid("placement_id")
      .notNull()
      .references(() => placement.id, { onDelete: "cascade" }),
    componentId: uuid("component_id")
      .notNull()
      .references(() => evaluationComponent.id, { onDelete: "restrict" }),
    evaluatorUserId: text("evaluator_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    comment: text("comment").default("").notNull(),
    status: evaluationStatus("status").default("draft").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("evaluation_submission_component_uidx").on(table.placementId, table.componentId),
    index("evaluation_submission_evaluator_idx").on(table.evaluatorUserId),
  ],
);

export const evaluationCriterionScore = pgTable(
  "evaluation_criterion_score",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => evaluationSubmission.id, { onDelete: "cascade" }),
    criterionId: uuid("criterion_id")
      .notNull()
      .references(() => evaluationCriterion.id, { onDelete: "restrict" }),
    score: integer("score").notNull(),
  },
  (table) => [
    check("evaluation_criterion_score_nonnegative", sql`${table.score} >= 0`),
    uniqueIndex("evaluation_criterion_score_uidx").on(table.submissionId, table.criterionId),
  ],
);

export const evaluationSchemeRelations = relations(evaluationScheme, ({ one, many }) => ({
  university: one(organization, {
    fields: [evaluationScheme.universityOrganizationId],
    references: [organization.id],
  }),
  components: many(evaluationComponent),
}));
export const evaluationComponentRelations = relations(evaluationComponent, ({ one, many }) => ({
  scheme: one(evaluationScheme, {
    fields: [evaluationComponent.schemeId],
    references: [evaluationScheme.id],
  }),
  criteria: many(evaluationCriterion),
  submissions: many(evaluationSubmission),
}));
export const evaluationCriterionRelations = relations(evaluationCriterion, ({ one, many }) => ({
  component: one(evaluationComponent, {
    fields: [evaluationCriterion.componentId],
    references: [evaluationComponent.id],
  }),
  scores: many(evaluationCriterionScore),
}));
export const evaluationSubmissionRelations = relations(evaluationSubmission, ({ one, many }) => ({
  placement: one(placement, {
    fields: [evaluationSubmission.placementId],
    references: [placement.id],
  }),
  component: one(evaluationComponent, {
    fields: [evaluationSubmission.componentId],
    references: [evaluationComponent.id],
  }),
  evaluator: one(user, {
    fields: [evaluationSubmission.evaluatorUserId],
    references: [user.id],
  }),
  scores: many(evaluationCriterionScore),
}));
export const evaluationCriterionScoreRelations = relations(evaluationCriterionScore, ({ one }) => ({
  submission: one(evaluationSubmission, {
    fields: [evaluationCriterionScore.submissionId],
    references: [evaluationSubmission.id],
  }),
  criterion: one(evaluationCriterion, {
    fields: [evaluationCriterionScore.criterionId],
    references: [evaluationCriterion.id],
  }),
}));
