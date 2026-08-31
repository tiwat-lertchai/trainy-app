import { AppError } from "../../lib/app-error";
import { type DomainNotifier, noOpNotifier } from "../../lib/domain-notifier";
import type { EvaluatorType, RubricPlacement, RubricRepository } from "./rubric.repository";

type ScoreInput = { criterionId: string; score: number };

export class RubricEvaluationService {
  constructor(
    private readonly repository: RubricRepository,
    private readonly now = () => new Date(),
    private readonly notifier: DomainNotifier = noOpNotifier,
  ) {}

  async getForm(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    await this.requireParticipantOrStaff(placement, actorUserId);
    const scheme = await this.requireScheme(placement);
    const submissions = await this.repository.listSubmissions(placementId);
    return { scheme, submissions: this.visibleSubmissions(submissions, actorUserId) };
  }

  async save(
    actorUserId: string,
    input: { placementId: string; componentId: string; comment: string; scores: ScoreInput[] },
  ) {
    const placement = await this.requirePlacement(input.placementId);
    if (!(["active", "completed"] as const).includes(placement.status as "active" | "completed"))
      throw new AppError("Placement is not ready for evaluation", 409, "PLACEMENT_NOT_EVALUATABLE");
    const scheme = await this.requireScheme(placement);
    const component = scheme.components.find((item: any) => item.id === input.componentId);
    if (!component)
      throw new AppError(
        "Evaluation component was not found",
        404,
        "EVALUATION_COMPONENT_NOT_FOUND",
      );
    await this.requireEvaluator(placement, actorUserId, component.evaluatorType);
    this.validateScores(component.criteria, input.scores, component.maxScore);

    const existing = await this.repository.findSubmissionByComponent(placement.id, component.id);
    if (existing?.status === "submitted")
      throw new AppError("Submitted evaluation is immutable", 409, "EVALUATION_IMMUTABLE");
    if (existing && existing.evaluatorUserId !== actorUserId)
      throw new AppError("Evaluation is owned by another evaluator", 409, "EVALUATION_OWNED");
    const submission = existing
      ? await this.repository.updateSubmission(existing.id, { comment: input.comment })
      : await this.repository.createSubmission({
          placementId: placement.id,
          componentId: component.id,
          evaluatorUserId: actorUserId,
          comment: input.comment,
        });
    await this.repository.replaceScores(submission.id, input.scores);
    return this.repository.findSubmission(submission.id);
  }

  async submit(actorUserId: string, submissionId: string) {
    const submission = await this.repository.findSubmission(submissionId);
    if (!submission || submission.evaluatorUserId !== actorUserId)
      throw new AppError("Evaluation was not found", 404, "EVALUATION_NOT_FOUND");
    if (submission.status !== "draft")
      throw new AppError("Evaluation is already submitted", 409, "EVALUATION_IMMUTABLE");
    this.validateScores(
      submission.component.criteria,
      submission.scores,
      submission.component.maxScore,
    );
    const updated = await this.repository.updateSubmission(submissionId, {
      status: "submitted",
      submittedAt: this.now(),
    });
    const placement = await this.requirePlacement(submission.placementId);
    await this.notifier.notify({
      userId: placement.studentUserId,
      type: "evaluation_submitted",
      title: "Evaluation submitted",
      message: `Your ${submission.component.evaluatorType} evaluation is available.`,
      entityType: "evaluation_submission",
      entityId: submission.id,
    });
    return updated;
  }

  async result(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    await this.requireParticipantOrStaff(placement, actorUserId);
    const scheme = await this.requireScheme(placement);
    const submissions = await this.repository.listSubmissions(placementId);
    const visible = this.visibleSubmissions(submissions, actorUserId);
    const submitted = submissions.filter((item) => item.status === "submitted");
    const total = submitted.reduce(
      (sum, item) =>
        sum +
        item.scores.reduce((componentSum: number, score: any) => componentSum + score.score, 0),
      0,
    );
    const maximum = scheme.components.reduce((sum: number, item: any) => sum + item.maxScore, 0);
    return {
      total,
      maximum,
      complete: submitted.length === scheme.components.length,
      grade: this.grade(total),
      submissions: visible,
    };
  }

  private validateScores(criteria: any[], scores: ScoreInput[], componentMax: number) {
    const scoreMap = new Map(scores.map((item) => [item.criterionId, item.score]));
    if (scoreMap.size !== scores.length || criteria.length !== scores.length)
      throw new AppError(
        "Every criterion must be scored exactly once",
        422,
        "INVALID_EVALUATION_SCORES",
      );
    let total = 0;
    for (const criterion of criteria) {
      const score = scoreMap.get(criterion.id);
      if (score === undefined || score > criterion.maxScore)
        throw new AppError(
          "A criterion score exceeds its configured maximum",
          422,
          "INVALID_EVALUATION_SCORES",
        );
      total += score;
    }
    if (total > componentMax)
      throw new AppError(
        "Component score exceeds its configured maximum",
        422,
        "INVALID_EVALUATION_SCORES",
      );
  }

  private visibleSubmissions(submissions: any[], actorUserId: string) {
    return submissions.filter(
      (item) => item.status === "submitted" || item.evaluatorUserId === actorUserId,
    );
  }

  private grade(score: number) {
    if (score >= 80) return { letter: "A", points: 4 };
    if (score >= 75) return { letter: "B+", points: 3.5 };
    if (score >= 70) return { letter: "B", points: 3 };
    if (score >= 65) return { letter: "C+", points: 2.5 };
    if (score >= 60) return { letter: "C", points: 2 };
    if (score >= 55) return { letter: "D+", points: 1.5 };
    if (score >= 50) return { letter: "D", points: 1 };
    return { letter: "F", points: 0 };
  }

  private async requirePlacement(id: string) {
    const placement = await this.repository.findPlacement(id);
    if (!placement) throw new AppError("Placement was not found", 404, "PLACEMENT_NOT_FOUND");
    return placement;
  }

  private async requireScheme(placement: RubricPlacement) {
    const scheme = await this.repository.findScheme(
      placement.universityOrganizationId,
      placement.track,
    );
    if (!scheme)
      throw new AppError(
        "No active evaluation scheme is configured",
        422,
        "EVALUATION_SCHEME_REQUIRED",
      );
    return scheme;
  }

  private async requireParticipantOrStaff(placement: RubricPlacement, userId: string) {
    if (
      [placement.studentUserId, placement.advisorUserId, placement.supervisorUserId].includes(
        userId,
      )
    )
      return;
    if (
      await this.repository.hasActiveUniversityStaffRole(placement.universityOrganizationId, userId)
    )
      return;
    throw new AppError("Placement access is required", 403, "PLACEMENT_ACCESS_REQUIRED");
  }

  private async requireEvaluator(placement: RubricPlacement, userId: string, type: EvaluatorType) {
    if (type === "advisor" && placement.advisorUserId === userId) return;
    if (type === "supervisor" && placement.supervisorUserId === userId) return;
    if (
      (type === "center_head" || type === "program_committee") &&
      (await this.repository.hasActiveUniversityStaffRole(
        placement.universityOrganizationId,
        userId,
      ))
    )
      return;
    throw new AppError("Assigned evaluator access is required", 403, "EVALUATOR_REQUIRED");
  }
}
