import { describe, expect, test } from "bun:test";
import type { ProgressPlacement, ProgressRecord, ProgressRepository } from "./progress.repository";
import { ProgressService } from "./progress.service";

describe("ProgressService", () => {
  test("lets the placement student create a draft", async () => {
    const repository = new MemoryProgressRepository();
    expect(await create(repository)).toMatchObject({
      status: "draft",
      studentUserId: "student",
    });
  });
  test("rejects reports for a non-active placement", async () => {
    const repository = new MemoryProgressRepository();
    repository.placement.status = "pending";
    expect(create(repository)).rejects.toMatchObject({
      code: "PLACEMENT_NOT_ACTIVE",
    });
  });
  test("locks report content after submission", async () => {
    const repository = new MemoryProgressRepository();
    repository.report = report({ status: "submitted" });
    expect(
      new ProgressService(repository).update("student", "report", {
        summary: "This change must not be saved after submission.",
      }),
    ).rejects.toMatchObject({ code: "PROGRESS_REPORT_IMMUTABLE" });
  });
  test("allows only assigned reviewers", async () => {
    const repository = new MemoryProgressRepository();
    repository.report = report({ status: "submitted" });
    expect(
      new ProgressService(repository).review("outsider", "report", "approved"),
    ).rejects.toMatchObject({ code: "PROGRESS_REVIEWER_REQUIRED" });
  });
  test("requires feedback when requesting revision", async () => {
    const repository = new MemoryProgressRepository();
    repository.report = report({ status: "submitted" });
    expect(
      new ProgressService(repository).review("advisor", "report", "revision_requested"),
    ).rejects.toMatchObject({ code: "PROGRESS_FEEDBACK_REQUIRED" });
  });
  test("supports submit, revision, edit, resubmit, and approval", async () => {
    const repository = new MemoryProgressRepository();
    repository.report = report();
    const notifications: unknown[] = [];
    const service = new ProgressService(repository, () => new Date("2026-10-10"), {
      async notify(input) {
        notifications.push(input);
      },
    });
    await service.submit("student", "report");
    await service.review("advisor", "report", "revision_requested", "Add measurable outcomes.");
    expect(
      await service.update("student", "report", {
        summary: "Updated summary with measurable outcomes and completed tasks.",
      }),
    ).toMatchObject({ status: "draft", feedback: null });
    await service.submit("student", "report");
    expect(await service.review("supervisor", "report", "approved")).toMatchObject({
      status: "approved",
      reviewerUserId: "supervisor",
    });
    expect(notifications).toHaveLength(2);
  });
});

class MemoryProgressRepository implements ProgressRepository {
  placement: ProgressPlacement = {
    id: "placement",
    studentUserId: "student",
    advisorUserId: "advisor",
    supervisorUserId: "supervisor",
    status: "active",
  };
  report?: ProgressRecord;
  async findPlacement(id: string) {
    return id === this.placement.id ? this.placement : undefined;
  }
  async findReport(id: string) {
    return this.report?.id === id ? this.report : undefined;
  }
  async create(input: Parameters<ProgressRepository["create"]>[0]) {
    if (this.report) return undefined;
    this.report = report(input);
    return this.report;
  }
  async update(id: string, changes: Parameters<ProgressRepository["update"]>[1]) {
    if (!this.report || this.report.id !== id) throw new Error("Missing report");
    Object.assign(this.report, changes);
    return this.report;
  }
  async listForPlacement(id: string) {
    return this.report?.placementId === id ? [this.report] : [];
  }
}

function create(repository: ProgressRepository) {
  return new ProgressService(repository).create({
    actorUserId: "student",
    placementId: "placement",
    periodStart: new Date("2026-10-01"),
    periodEnd: new Date("2026-10-07"),
    summary: "Completed assigned backend tasks and documented the implementation.",
    hoursWorked: 40,
  });
}
function report(overrides: Partial<ProgressRecord> = {}): ProgressRecord {
  const now = new Date("2026-10-08");
  return {
    id: "report",
    placementId: "placement",
    studentUserId: "student",
    periodStart: new Date("2026-10-01"),
    periodEnd: new Date("2026-10-07"),
    summary: "Completed assigned backend tasks and documented the implementation.",
    hoursWorked: 40,
    status: "draft",
    reviewerUserId: null,
    feedback: null,
    submittedAt: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
