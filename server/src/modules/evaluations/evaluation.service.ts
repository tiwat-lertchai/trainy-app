import { AppError } from "../../lib/app-error";
import type { EvaluationRepository } from "./evaluation.repository";
type Scores = {
  technicalScore: number;
  communicationScore: number;
  responsibilityScore: number;
  comment: string;
};
export class EvaluationService {
  constructor(
    private readonly repository: EvaluationRepository,
    private readonly now = () => new Date(),
  ) {}
  async save(actorUserId: string, placementId: string, scores: Scores) {
    const placement = await this.requirePlacement(placementId);
    const type = this.evaluatorType(placement, actorUserId);
    if (!type)
      throw new AppError(
        "Assigned evaluator access is required",
        403,
        "EVALUATOR_REQUIRED",
      );
    if (
      !(["active", "completed"] as const).includes(
        placement.status as "active" | "completed",
      )
    )
      throw new AppError(
        "Placement is not ready for evaluation",
        409,
        "PLACEMENT_NOT_EVALUATABLE",
      );
    const existing = await this.repository.findByType(placement.id, type);
    if (existing?.status === "submitted")
      throw new AppError(
        "Submitted evaluation is immutable",
        409,
        "EVALUATION_IMMUTABLE",
      );
    return existing
      ? this.repository.update(existing.id, scores)
      : this.repository.create({
          placementId,
          evaluatorUserId: actorUserId,
          evaluatorType: type,
          ...scores,
        });
  }
  async submit(actorUserId: string, id: string) {
    const record = await this.repository.findById(id);
    if (!record)
      throw new AppError(
        "Evaluation was not found",
        404,
        "EVALUATION_NOT_FOUND",
      );
    if (record.evaluatorUserId !== actorUserId)
      throw new AppError(
        "Evaluation was not found",
        404,
        "EVALUATION_NOT_FOUND",
      );
    if (record.status !== "draft")
      throw new AppError(
        "Evaluation is already submitted",
        409,
        "EVALUATION_IMMUTABLE",
      );
    return this.repository.update(id, {
      status: "submitted",
      submittedAt: this.now(),
    });
  }
  async list(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    const isParticipant = [
      placement.studentUserId,
      placement.advisorUserId,
      placement.supervisorUserId,
    ].includes(actorUserId);
    if (!isParticipant)
      throw new AppError(
        "Placement access is required",
        403,
        "PLACEMENT_ACCESS_REQUIRED",
      );
    const records = await this.repository.list(placementId);
    return actorUserId === placement.studentUserId
      ? records.filter((r) => r.status === "submitted")
      : records;
  }
  private async requirePlacement(id: string) {
    const r = await this.repository.findPlacement(id);
    if (!r)
      throw new AppError("Placement was not found", 404, "PLACEMENT_NOT_FOUND");
    return r;
  }
  private evaluatorType(
    p: Awaited<ReturnType<EvaluationRepository["findPlacement"]>> & {},
    userId: string,
  ) {
    if (p?.advisorUserId === userId) return "advisor" as const;
    if (p?.supervisorUserId === userId) return "supervisor" as const;
    return undefined;
  }
}
