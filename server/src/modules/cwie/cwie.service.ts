import { AppError } from "../../lib/app-error";
import { type DomainNotifier, noOpNotifier } from "../../lib/domain-notifier";
import type {
  CwieEntryRecord,
  CwieMonthlySummaryRecord,
  CwiePlacement,
  CwieRepository,
} from "./cwie.repository";
import type { CwieEntryInput, MonthlySummaryInput, VisitInput } from "./cwie.schema";

type ReviewDecision = "approved" | "revision_requested";
type ReviewerRole = "advisor" | "supervisor";

export class CwieService {
  constructor(
    private readonly repository: CwieRepository,
    private readonly now = () => new Date(),
    private readonly notifier: DomainNotifier = noOpNotifier,
  ) {}

  async getWorkspace(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    this.requireParticipant(placement, actorUserId);
    const [entries, visits, monthlySummaries] = await Promise.all([
      this.repository.listEntries(placementId),
      this.repository.listVisits(placementId),
      this.repository.listSummaries(placementId),
    ]);
    return { entries, visits, monthlySummaries };
  }

  async createEntry(actorUserId: string, input: CwieEntryInput) {
    const placement = await this.requirePlacement(input.placementId);
    this.requireActivePlacement(placement);
    this.requireStudent(placement, actorUserId);
    this.requireEntryDates(placement, input);
    const record = await this.repository.createEntry({
      ...this.entryValues(input),
      placementId: placement.id,
      studentUserId: actorUserId,
    });
    if (!record)
      throw new AppError(
        "A CWIE entry already exists for this date or period",
        409,
        "CWIE_ENTRY_CONFLICT",
      );
    return record;
  }

  async updateEntry(actorUserId: string, entryId: string, input: CwieEntryInput) {
    const entry = await this.requireEntry(entryId);
    const placement = await this.requirePlacement(entry.placementId);
    this.requireStudent(placement, actorUserId);
    if (entry.type !== input.type || entry.placementId !== input.placementId)
      throw new AppError(
        "Entry type and placement cannot change",
        422,
        "CWIE_ENTRY_IDENTITY_FIXED",
      );
    this.requireEditable(entry.status);
    this.requireEntryDates(placement, input);
    return this.repository.updateEntry(entry.id, {
      ...this.emptyEntryContent(),
      ...this.entryValues(input),
      status: "draft",
      ...this.clearReviews(),
    });
  }

  async submitEntry(actorUserId: string, entryId: string) {
    const entry = await this.requireEntry(entryId);
    const placement = await this.requirePlacement(entry.placementId);
    this.requireStudent(placement, actorUserId);
    this.requireEditable(entry.status);
    const submitted = await this.repository.updateEntry(entry.id, {
      status: "submitted",
      submittedAt: this.now(),
    });
    await this.notifyReviewers(placement, "CWIE work entry", entry.id);
    return submitted;
  }

  async reviewEntry(
    actorUserId: string,
    entryId: string,
    decision: ReviewDecision,
    comment?: string,
  ) {
    const entry = await this.requireEntry(entryId);
    const placement = await this.requirePlacement(entry.placementId);
    const role = this.requireReviewer(placement, actorUserId);
    if (entry.status !== "submitted")
      throw new AppError("Only submitted entries can be reviewed", 409, "CWIE_ENTRY_NOT_SUBMITTED");
    this.requireReviewComment(decision, comment);
    const otherDecision = role === "advisor" ? entry.supervisorDecision : entry.advisorDecision;
    const status = this.reviewedStatus(decision, otherDecision);
    await this.repository.updateEntry(entry.id, {
      status,
      ...(role === "advisor"
        ? {
            advisorDecision: decision,
            advisorComment: comment ?? null,
            advisorReviewedByUserId: actorUserId,
            advisorReviewedAt: this.now(),
          }
        : {
            supervisorDecision: decision,
            supervisorComment: comment ?? null,
            supervisorReviewedByUserId: actorUserId,
            supervisorReviewedAt: this.now(),
          }),
    });
    const reviewed = await this.finalizeEntryReview(entry.id);
    await this.notifyReview(
      entry.studentUserId,
      "CWIE work entry",
      entry.id,
      this.finalStatus(reviewed.advisorDecision, reviewed.supervisorDecision),
    );
    return reviewed;
  }

  async createVisit(actorUserId: string, input: VisitInput) {
    const placement = await this.requirePlacement(input.placementId);
    this.requireActivePlacement(placement);
    this.requireAdvisor(placement, actorUserId);
    this.requireDateWithinPlacement(placement, input.scheduledAt);
    const record = await this.repository.createVisit({
      placementId: placement.id,
      visitNumber: input.visitNumber,
      scheduledAt: input.scheduledAt,
      mode: input.mode,
      location: input.location,
      notes: input.notes,
      advisorUserId: actorUserId,
    });
    if (!record)
      throw new AppError(
        "This placement already has that visit number",
        409,
        "CWIE_VISIT_CONFLICT",
      );
    await this.notifier.notify({
      userId: placement.studentUserId,
      type: "cwie_visit_scheduled",
      title: "Supervision visit scheduled",
      message: `Supervision visit ${input.visitNumber} has been scheduled.`,
      entityType: "cwie_visit",
      entityId: record.id,
    });
    if (placement.supervisorUserId)
      await this.notifier.notify({
        userId: placement.supervisorUserId,
        type: "cwie_visit_scheduled",
        title: "Supervision visit scheduled",
        message: `Supervision visit ${input.visitNumber} has been scheduled.`,
        entityType: "cwie_visit",
        entityId: record.id,
      });
    return record;
  }

  async updateVisit(
    actorUserId: string,
    visitId: string,
    input: Omit<VisitInput, "placementId"> & { status?: "scheduled" | "cancelled" },
  ) {
    const visit = await this.requireVisit(visitId);
    const placement = await this.requirePlacement(visit.placementId);
    this.requireAdvisor(placement, actorUserId);
    if (visit.status === "completed")
      throw new AppError("A completed visit is immutable", 409, "CWIE_VISIT_COMPLETED");
    this.requireDateWithinPlacement(placement, input.scheduledAt);
    return this.repository.updateVisit(visit.id, input);
  }

  async saveVisitReport(
    actorUserId: string,
    visitId: string,
    input: {
      visitedAt: Date;
      workObserved: string;
      studentProgress: string;
      issuesFound: string;
      solutionsAgreed: string;
      recommendations: string;
    },
  ) {
    const visit = await this.requireVisit(visitId);
    const placement = await this.requirePlacement(visit.placementId);
    this.requireAdvisor(placement, actorUserId);
    if (visit.status === "cancelled")
      throw new AppError("A cancelled visit cannot receive a report", 409, "CWIE_VISIT_CANCELLED");
    if (visit.status === "completed")
      throw new AppError("A completed visit is immutable", 409, "CWIE_VISIT_COMPLETED");
    this.requireDateWithinPlacement(placement, input.visitedAt);
    const record = await this.repository.updateVisit(visit.id, {
      ...input,
      status: "completed",
    });
    await this.notifier.notify({
      userId: placement.studentUserId,
      type: "cwie_visit_completed",
      title: "Supervision report recorded",
      message: `The report for supervision visit ${visit.visitNumber} is available.`,
      entityType: "cwie_visit",
      entityId: visit.id,
    });
    return record;
  }

  async createSummary(actorUserId: string, input: MonthlySummaryInput) {
    const placement = await this.requirePlacement(input.placementId);
    this.requireActivePlacement(placement);
    this.requireStudent(placement, actorUserId);
    const month = `${input.month}-01`;
    this.requireMonthWithinPlacement(placement, input.month);
    const record = await this.repository.createSummary({
      ...input,
      month,
      studentUserId: actorUserId,
    });
    if (!record)
      throw new AppError(
        "A monthly summary already exists for this month",
        409,
        "CWIE_MONTHLY_SUMMARY_CONFLICT",
      );
    return record;
  }

  async updateSummary(actorUserId: string, summaryId: string, input: MonthlySummaryInput) {
    const summary = await this.requireSummary(summaryId);
    const placement = await this.requirePlacement(summary.placementId);
    this.requireStudent(placement, actorUserId);
    if (summary.placementId !== input.placementId)
      throw new AppError("Summary placement cannot change", 422, "CWIE_SUMMARY_PLACEMENT_FIXED");
    this.requireEditable(summary.status);
    const month = `${input.month}-01`;
    this.requireMonthWithinPlacement(placement, input.month);
    return this.repository.updateSummary(summary.id, {
      ...input,
      month,
      status: "draft",
      ...this.clearReviews(),
    });
  }

  async submitSummary(actorUserId: string, summaryId: string) {
    const summary = await this.requireSummary(summaryId);
    const placement = await this.requirePlacement(summary.placementId);
    this.requireStudent(placement, actorUserId);
    this.requireEditable(summary.status);
    const submitted = await this.repository.updateSummary(summary.id, {
      status: "submitted",
      submittedAt: this.now(),
    });
    await this.notifyReviewers(placement, "CWIE monthly summary", summary.id);
    return submitted;
  }

  async reviewSummary(
    actorUserId: string,
    summaryId: string,
    decision: ReviewDecision,
    comment?: string,
  ) {
    const summary = await this.requireSummary(summaryId);
    const placement = await this.requirePlacement(summary.placementId);
    const role = this.requireReviewer(placement, actorUserId);
    if (summary.status !== "submitted")
      throw new AppError(
        "Only submitted monthly summaries can be reviewed",
        409,
        "CWIE_SUMMARY_NOT_SUBMITTED",
      );
    this.requireReviewComment(decision, comment);
    const otherDecision = role === "advisor" ? summary.supervisorDecision : summary.advisorDecision;
    const status = this.reviewedStatus(decision, otherDecision);
    await this.repository.updateSummary(summary.id, {
      status,
      ...(role === "advisor"
        ? {
            advisorDecision: decision,
            advisorComment: comment ?? null,
            advisorReviewedByUserId: actorUserId,
            advisorReviewedAt: this.now(),
          }
        : {
            supervisorDecision: decision,
            supervisorComment: comment ?? null,
            supervisorReviewedByUserId: actorUserId,
            supervisorReviewedAt: this.now(),
          }),
    });
    const reviewed = await this.finalizeSummaryReview(summary.id);
    await this.notifyReview(
      summary.studentUserId,
      "CWIE monthly summary",
      summary.id,
      this.finalStatus(reviewed.advisorDecision, reviewed.supervisorDecision),
    );
    return reviewed;
  }

  private entryValues(input: CwieEntryInput): Partial<CwieEntryRecord> & {
    type: CwieEntryInput["type"];
  } {
    if (input.type === "daily_log")
      return {
        type: input.type,
        workDate: input.workDate,
        activities: input.activities,
        learning: input.learning,
        problems: input.problems,
        solutions: input.solutions,
        hoursWorked: input.hoursWorked,
      };
    if (input.type === "weekly_plan")
      return {
        type: input.type,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        weekNumber: input.weekNumber,
        plannedTasks: input.plannedTasks,
        actualTasks: input.actualTasks,
        problems: input.problems,
        solutions: input.solutions,
        plannedHours: input.plannedHours,
        hoursWorked: input.hoursWorked,
        completionPercentage: input.completionPercentage,
      };
    return {
      type: input.type,
      workDate: input.workDate,
      activities: input.activities,
      learning: input.learning,
      problems: input.problems,
      solutions: input.solutions,
      outcomes: input.outcomes,
    };
  }

  private emptyEntryContent(): Partial<CwieEntryRecord> {
    return {
      workDate: null,
      periodStart: null,
      periodEnd: null,
      weekNumber: null,
      activities: null,
      learning: null,
      problems: null,
      solutions: null,
      outcomes: null,
      plannedTasks: null,
      actualTasks: null,
      plannedHours: null,
      hoursWorked: null,
      completionPercentage: null,
    };
  }

  private clearReviews() {
    return {
      advisorDecision: null,
      advisorComment: null,
      advisorReviewedByUserId: null,
      advisorReviewedAt: null,
      supervisorDecision: null,
      supervisorComment: null,
      supervisorReviewedByUserId: null,
      supervisorReviewedAt: null,
      submittedAt: null,
    } as const;
  }

  private reviewedStatus(decision: ReviewDecision, otherDecision: ReviewDecision | null) {
    if (decision === "revision_requested") return "revision_requested" as const;
    return otherDecision === "approved" ? ("approved" as const) : ("submitted" as const);
  }

  private finalStatus(
    advisor: ReviewDecision | null,
    supervisor: ReviewDecision | null,
  ): "submitted" | "approved" | "revision_requested" {
    if (advisor === "revision_requested" || supervisor === "revision_requested")
      return "revision_requested";
    return advisor === "approved" && supervisor === "approved" ? "approved" : "submitted";
  }

  private async finalizeEntryReview(id: string) {
    const current = await this.requireEntry(id);
    const status = this.finalStatus(current.advisorDecision, current.supervisorDecision);
    return current.status === status
      ? current
      : this.repository.updateEntry(current.id, { status });
  }

  private async finalizeSummaryReview(id: string) {
    const current = await this.requireSummary(id);
    const status = this.finalStatus(current.advisorDecision, current.supervisorDecision);
    return current.status === status
      ? current
      : this.repository.updateSummary(current.id, { status });
  }

  private requireReviewComment(decision: ReviewDecision, comment?: string) {
    if (decision === "revision_requested" && !comment?.trim())
      throw new AppError("A revision comment is required", 422, "CWIE_REVIEW_COMMENT_REQUIRED");
  }

  private requireEntryDates(placement: CwiePlacement, input: CwieEntryInput) {
    if (input.type === "weekly_plan") {
      this.requireDateStringWithinPlacement(placement, input.periodStart);
      this.requireDateStringWithinPlacement(placement, input.periodEnd);
      return;
    }
    this.requireDateStringWithinPlacement(placement, input.workDate);
  }

  private requireDateWithinPlacement(placement: CwiePlacement, value: Date) {
    this.requireDateStringWithinPlacement(placement, value.toISOString().slice(0, 10));
  }

  private requireDateStringWithinPlacement(placement: CwiePlacement, value: string) {
    const start = placement.startDate.toISOString().slice(0, 10);
    const end = placement.endDate.toISOString().slice(0, 10);
    if (value < start || value > end)
      throw new AppError(
        "The date must fall within the placement period",
        422,
        "CWIE_DATE_OUTSIDE_PLACEMENT",
      );
  }

  private requireMonthWithinPlacement(placement: CwiePlacement, month: string) {
    const monthStart = `${month}-01`;
    const [year, monthNumber] = month.split("-").map(Number);
    const monthEnd = new Date(Date.UTC(year!, monthNumber!, 0)).toISOString().slice(0, 10);
    const placementStart = placement.startDate.toISOString().slice(0, 10);
    const placementEnd = placement.endDate.toISOString().slice(0, 10);
    if (monthEnd < placementStart || monthStart > placementEnd)
      throw new AppError(
        "The month must overlap the placement period",
        422,
        "CWIE_DATE_OUTSIDE_PLACEMENT",
      );
  }

  private requireEditable(status: CwieEntryRecord["status"] | CwieMonthlySummaryRecord["status"]) {
    if (status !== "draft" && status !== "revision_requested")
      throw new AppError("Submitted content is immutable", 409, "CWIE_CONTENT_IMMUTABLE");
  }

  private requireActivePlacement(placement: CwiePlacement) {
    if (placement.status !== "active")
      throw new AppError("CWIE records require an active placement", 409, "PLACEMENT_NOT_ACTIVE");
  }

  private requireStudent(placement: CwiePlacement, actorUserId: string) {
    if (placement.studentUserId !== actorUserId)
      throw new AppError("CWIE record was not found", 404, "CWIE_RECORD_NOT_FOUND");
  }

  private requireAdvisor(placement: CwiePlacement, actorUserId: string) {
    if (placement.advisorUserId !== actorUserId)
      throw new AppError("Assigned advisor access is required", 403, "CWIE_ADVISOR_REQUIRED");
  }

  private requireReviewer(placement: CwiePlacement, actorUserId: string): ReviewerRole {
    if (placement.advisorUserId === actorUserId) return "advisor";
    if (placement.supervisorUserId === actorUserId) return "supervisor";
    throw new AppError("Assigned reviewer access is required", 403, "CWIE_REVIEWER_REQUIRED");
  }

  private requireParticipant(placement: CwiePlacement, actorUserId: string) {
    if (
      ![placement.studentUserId, placement.advisorUserId, placement.supervisorUserId].includes(
        actorUserId,
      )
    )
      throw new AppError("Placement access is required", 403, "PLACEMENT_ACCESS_REQUIRED");
  }

  private async requirePlacement(id: string) {
    const record = await this.repository.findPlacement(id);
    if (!record) throw new AppError("Placement was not found", 404, "PLACEMENT_NOT_FOUND");
    return record;
  }

  private async requireEntry(id: string) {
    const record = await this.repository.findEntry(id);
    if (!record) throw new AppError("CWIE entry was not found", 404, "CWIE_ENTRY_NOT_FOUND");
    return record;
  }

  private async requireVisit(id: string) {
    const record = await this.repository.findVisit(id);
    if (!record) throw new AppError("CWIE visit was not found", 404, "CWIE_VISIT_NOT_FOUND");
    return record;
  }

  private async requireSummary(id: string) {
    const record = await this.repository.findSummary(id);
    if (!record)
      throw new AppError("CWIE monthly summary was not found", 404, "CWIE_SUMMARY_NOT_FOUND");
    return record;
  }

  private async notifyReview(
    studentUserId: string,
    label: string,
    entityId: string,
    status: "submitted" | "approved" | "revision_requested",
  ) {
    await this.notifier.notify({
      userId: studentUserId,
      type: "cwie_reviewed",
      title: `${label} reviewed`,
      message:
        status === "approved"
          ? `Your ${label.toLowerCase()} was approved by both reviewers.`
          : status === "revision_requested"
            ? `Your ${label.toLowerCase()} needs revision.`
            : `One reviewer approved your ${label.toLowerCase()}.`,
      entityType: label.includes("monthly") ? "cwie_monthly_summary" : "cwie_entry",
      entityId,
    });
  }

  private async notifyReviewers(placement: CwiePlacement, label: string, entityId: string) {
    const reviewerIds = [placement.advisorUserId, placement.supervisorUserId].filter(
      (value): value is string => Boolean(value),
    );
    await Promise.all(
      reviewerIds.map((userId) =>
        this.notifier.notify({
          userId,
          type: "cwie_submitted",
          title: `${label} submitted`,
          message: `A ${label.toLowerCase()} is ready for your review.`,
          entityType: label.includes("monthly") ? "cwie_monthly_summary" : "cwie_entry",
          entityId,
        }),
      ),
    );
  }
}
