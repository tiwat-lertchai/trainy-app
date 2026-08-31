import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import {
  evaluationComponent,
  evaluationCriterion,
  evaluationCriterionScore,
  evaluationScheme,
  evaluationSubmission,
  organizationMembership,
  placement,
} from "../../db/schema";

export type RubricPlacement = Pick<
  typeof placement.$inferSelect,
  | "id"
  | "studentUserId"
  | "advisorUserId"
  | "supervisorUserId"
  | "universityOrganizationId"
  | "track"
  | "status"
>;
export type RubricSubmission = typeof evaluationSubmission.$inferSelect;
export type EvaluatorType = typeof evaluationComponent.$inferSelect.evaluatorType;

export interface RubricRepository {
  findPlacement(id: string): Promise<RubricPlacement | undefined>;
  hasActiveUniversityStaffRole(organizationId: string, userId: string): Promise<boolean>;
  findScheme(universityOrganizationId: string, track: "regular" | "cooperative"): Promise<any>;
  findSubmission(id: string): Promise<any>;
  findSubmissionByComponent(placementId: string, componentId: string): Promise<any>;
  createSubmission(input: {
    placementId: string;
    componentId: string;
    evaluatorUserId: string;
    comment: string;
  }): Promise<RubricSubmission>;
  updateSubmission(
    id: string,
    changes: Partial<Pick<RubricSubmission, "comment" | "status" | "submittedAt">>,
  ): Promise<RubricSubmission>;
  replaceScores(
    submissionId: string,
    scores: Array<{ criterionId: string; score: number }>,
  ): Promise<void>;
  listSubmissions(placementId: string): Promise<any[]>;
}

const submissionWithDetails = {
  component: { with: { criteria: { orderBy: (t: any, { asc }: any) => [asc(t.sortOrder)] } } },
  scores: true,
} as const;

export class DrizzleRubricRepository implements RubricRepository {
  constructor(private readonly database: Database) {}

  findPlacement(id: string) {
    return this.database.query.placement.findFirst({
      columns: {
        id: true,
        studentUserId: true,
        advisorUserId: true,
        supervisorUserId: true,
        universityOrganizationId: true,
        track: true,
        status: true,
      },
      where: eq(placement.id, id),
    });
  }

  async hasActiveUniversityStaffRole(organizationId: string, userId: string) {
    const membership = await this.database.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
        eq(organizationMembership.status, "active"),
      ),
    });
    return membership?.role === "university_admin" || membership?.role === "coordinator";
  }

  findScheme(universityOrganizationId: string, track: "regular" | "cooperative") {
    return this.database.query.evaluationScheme.findFirst({
      where: and(
        eq(evaluationScheme.universityOrganizationId, universityOrganizationId),
        eq(evaluationScheme.track, track),
        eq(evaluationScheme.isActive, 1),
      ),
      orderBy: (t, { desc }) => [desc(t.version)],
      with: {
        components: {
          orderBy: (t, { asc }) => [asc(t.sortOrder)],
          with: { criteria: { orderBy: (t, { asc }) => [asc(t.sortOrder)] } },
        },
      },
    });
  }

  findSubmission(id: string) {
    return this.database.query.evaluationSubmission.findFirst({
      where: eq(evaluationSubmission.id, id),
      with: submissionWithDetails,
    });
  }

  findSubmissionByComponent(placementId: string, componentId: string) {
    return this.database.query.evaluationSubmission.findFirst({
      where: and(
        eq(evaluationSubmission.placementId, placementId),
        eq(evaluationSubmission.componentId, componentId),
      ),
      with: submissionWithDetails,
    });
  }

  async createSubmission(input: Parameters<RubricRepository["createSubmission"]>[0]) {
    const [record] = await this.database.insert(evaluationSubmission).values(input).returning();
    if (!record) throw new Error("Database did not return evaluation submission");
    return record;
  }

  async updateSubmission(id: string, changes: Parameters<RubricRepository["updateSubmission"]>[1]) {
    const [record] = await this.database
      .update(evaluationSubmission)
      .set(changes)
      .where(eq(evaluationSubmission.id, id))
      .returning();
    if (!record) throw new Error("Database did not return evaluation submission");
    return record;
  }

  async replaceScores(submissionId: string, scores: Array<{ criterionId: string; score: number }>) {
    await this.database.transaction(async (tx) => {
      await tx
        .delete(evaluationCriterionScore)
        .where(eq(evaluationCriterionScore.submissionId, submissionId));
      if (scores.length > 0)
        await tx
          .insert(evaluationCriterionScore)
          .values(scores.map((score) => ({ submissionId, ...score })));
    });
  }

  listSubmissions(placementId: string) {
    return this.database.query.evaluationSubmission.findMany({
      where: eq(evaluationSubmission.placementId, placementId),
      with: submissionWithDetails,
    });
  }
}
