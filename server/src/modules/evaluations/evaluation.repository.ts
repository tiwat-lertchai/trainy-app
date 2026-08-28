import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { placement, placementEvaluation } from "../../db/schema";
export type EvaluationRecord = typeof placementEvaluation.$inferSelect;
export type EvaluationPlacement = Pick<
  typeof placement.$inferSelect,
  "id" | "studentUserId" | "advisorUserId" | "supervisorUserId" | "status"
>;
export interface EvaluationRepository {
  findPlacement(id: string): Promise<EvaluationPlacement | undefined>;
  findByType(
    placementId: string,
    type: "advisor" | "supervisor",
  ): Promise<EvaluationRecord | undefined>;
  findById(id: string): Promise<EvaluationRecord | undefined>;
  create(
    input: Pick<
      EvaluationRecord,
      | "placementId"
      | "evaluatorUserId"
      | "evaluatorType"
      | "technicalScore"
      | "communicationScore"
      | "responsibilityScore"
      | "comment"
    >,
  ): Promise<EvaluationRecord>;
  update(
    id: string,
    changes: Partial<
      Pick<
        EvaluationRecord,
        | "technicalScore"
        | "communicationScore"
        | "responsibilityScore"
        | "comment"
        | "status"
        | "submittedAt"
      >
    >,
  ): Promise<EvaluationRecord>;
  list(placementId: string): Promise<EvaluationRecord[]>;
}
export class DrizzleEvaluationRepository implements EvaluationRepository {
  constructor(private readonly database: Database) {}
  findPlacement(id: string) {
    return this.database.query.placement.findFirst({
      columns: {
        id: true,
        studentUserId: true,
        advisorUserId: true,
        supervisorUserId: true,
        status: true,
      },
      where: eq(placement.id, id),
    });
  }
  findByType(placementId: string, type: "advisor" | "supervisor") {
    return this.database.query.placementEvaluation.findFirst({
      where: (t, { and }) => and(eq(t.placementId, placementId), eq(t.evaluatorType, type)),
    });
  }
  findById(id: string) {
    return this.database.query.placementEvaluation.findFirst({
      where: eq(placementEvaluation.id, id),
    });
  }
  async create(input: Parameters<EvaluationRepository["create"]>[0]) {
    const [r] = await this.database.insert(placementEvaluation).values(input).returning();
    if (!r) throw new Error("Database did not return evaluation");
    return r;
  }
  async update(id: string, changes: Parameters<EvaluationRepository["update"]>[1]) {
    const [r] = await this.database
      .update(placementEvaluation)
      .set(changes)
      .where(eq(placementEvaluation.id, id))
      .returning();
    if (!r) throw new Error("Database did not return evaluation");
    return r;
  }
  list(placementId: string) {
    return this.database.query.placementEvaluation.findMany({
      where: eq(placementEvaluation.placementId, placementId),
    });
  }
}
