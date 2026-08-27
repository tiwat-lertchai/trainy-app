import { AppError } from "../../lib/app-error";
import type { ProgressRecord, ProgressRepository } from "./progress.repository";

export class ProgressService {
  constructor(
    private readonly repository: ProgressRepository,
    private readonly now = () => new Date(),
  ) {}
  async create(input: {
    actorUserId: string;
    placementId: string;
    periodStart: Date;
    periodEnd: Date;
    summary: string;
    hoursWorked: number;
  }) {
    const placement = await this.requirePlacement(input.placementId);
    this.requireStudent(placement.studentUserId, input.actorUserId);
    if (placement.status !== "active")
      throw new AppError(
        "Progress reports require an active placement",
        409,
        "PLACEMENT_NOT_ACTIVE",
      );
    this.requirePeriod(input.periodStart, input.periodEnd);
    const record = await this.repository.create({
      ...input,
      studentUserId: input.actorUserId,
    });
    if (!record)
      throw new AppError(
        "A report already exists for this period",
        409,
        "PROGRESS_REPORT_CONFLICT",
      );
    return record;
  }
  async update(
    actorUserId: string,
    reportId: string,
    changes: Partial<
      Pick<
        ProgressRecord,
        "periodStart" | "periodEnd" | "summary" | "hoursWorked"
      >
    >,
  ) {
    const report = await this.requireReport(reportId);
    this.requireStudent(report.studentUserId, actorUserId);
    if (
      !(["draft", "revision_requested"] as const).includes(
        report.status as "draft" | "revision_requested",
      )
    )
      throw new AppError(
        "Submitted report content is immutable",
        409,
        "PROGRESS_REPORT_IMMUTABLE",
      );
    this.requirePeriod(
      changes.periodStart ?? report.periodStart,
      changes.periodEnd ?? report.periodEnd,
    );
    return this.repository.update(report.id, {
      ...changes,
      status: "draft",
      feedback: null,
      reviewerUserId: null,
      reviewedAt: null,
    });
  }
  async submit(actorUserId: string, reportId: string) {
    const report = await this.requireReport(reportId);
    this.requireStudent(report.studentUserId, actorUserId);
    if (
      !(["draft", "revision_requested"] as const).includes(
        report.status as "draft" | "revision_requested",
      )
    )
      throw new AppError(
        "Report cannot be submitted from its current status",
        409,
        "INVALID_PROGRESS_TRANSITION",
      );
    return this.repository.update(report.id, {
      status: "submitted",
      submittedAt: this.now(),
    });
  }
  async review(
    actorUserId: string,
    reportId: string,
    decision: "approved" | "revision_requested",
    feedback?: string,
  ) {
    const report = await this.requireReport(reportId);
    const placement = await this.requirePlacement(report.placementId);
    if (
      ![placement.advisorUserId, placement.supervisorUserId].includes(
        actorUserId,
      )
    )
      throw new AppError(
        "Assigned reviewer access is required",
        403,
        "PROGRESS_REVIEWER_REQUIRED",
      );
    if (report.status !== "submitted")
      throw new AppError(
        "Only submitted reports can be reviewed",
        409,
        "INVALID_PROGRESS_TRANSITION",
      );
    if (decision === "revision_requested" && !feedback?.trim())
      throw new AppError(
        "Feedback is required",
        422,
        "PROGRESS_FEEDBACK_REQUIRED",
      );
    return this.repository.update(report.id, {
      status: decision,
      feedback: feedback ?? null,
      reviewerUserId: actorUserId,
      reviewedAt: this.now(),
    });
  }
  async list(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    if (
      ![
        placement.studentUserId,
        placement.advisorUserId,
        placement.supervisorUserId,
      ].includes(actorUserId)
    )
      throw new AppError(
        "Placement access is required",
        403,
        "PLACEMENT_ACCESS_REQUIRED",
      );
    return this.repository.listForPlacement(placementId);
  }
  private async requirePlacement(id: string) {
    const record = await this.repository.findPlacement(id);
    if (!record)
      throw new AppError("Placement was not found", 404, "PLACEMENT_NOT_FOUND");
    return record;
  }
  private async requireReport(id: string) {
    const record = await this.repository.findReport(id);
    if (!record)
      throw new AppError(
        "Progress report was not found",
        404,
        "PROGRESS_REPORT_NOT_FOUND",
      );
    return record;
  }
  private requireStudent(ownerId: string, actorId: string) {
    if (ownerId !== actorId)
      throw new AppError(
        "Progress report was not found",
        404,
        "PROGRESS_REPORT_NOT_FOUND",
      );
  }
  private requirePeriod(start: Date, end: Date) {
    if (end < start)
      throw new AppError(
        "Period end must not precede period start",
        422,
        "INVALID_PROGRESS_PERIOD",
      );
  }
}
