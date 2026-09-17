import { describe, expect, test } from "bun:test";
import type {
  CwieEntryRecord,
  CwieMonthlySummaryRecord,
  CwiePlacement,
  CwieRepository,
  CwieVisitRecord,
} from "./cwie.repository";
import { CwieService } from "./cwie.service";

const now = new Date("2026-06-15T09:00:00.000Z");

describe("CwieService", () => {
  test("lets the placement student create and submit a structured daily log", async () => {
    const repository = memoryRepository();
    const notifications: unknown[] = [];
    const service = new CwieService(repository, () => now, {
      async notify(input) {
        notifications.push(input);
      },
    });
    const entry = await service.createEntry("student", dailyInput);
    expect(entry).toMatchObject({ type: "daily_log", status: "draft", studentUserId: "student" });

    const submitted = await service.submitEntry("student", entry.id);
    expect(submitted).toMatchObject({ status: "submitted", submittedAt: now });
    expect(notifications).toHaveLength(2);
  });

  test("hides student-owned entries from another student", async () => {
    const repository = memoryRepository();
    const service = new CwieService(repository);
    const entry = await service.createEntry("student", dailyInput);
    await expect(service.updateEntry("outsider", entry.id, dailyInput)).rejects.toMatchObject({
      statusCode: 404,
      code: "CWIE_RECORD_NOT_FOUND",
    });
  });

  test("requires both assigned reviewers before an entry is approved", async () => {
    const repository = memoryRepository();
    const service = new CwieService(repository, () => now);
    const entry = await service.createEntry("student", dailyInput);
    await service.submitEntry("student", entry.id);

    const first = await service.reviewEntry("advisor", entry.id, "approved", "Complete");
    expect(first.status).toBe("submitted");
    const second = await service.reviewEntry("supervisor", entry.id, "approved", "Certified");
    expect(second.status).toBe("approved");
  });

  test("returns a submitted entry for revision and clears reviews when edited", async () => {
    const repository = memoryRepository();
    const service = new CwieService(repository, () => now);
    const entry = await service.createEntry("student", dailyInput);
    await service.submitEntry("student", entry.id);
    await service.reviewEntry("advisor", entry.id, "revision_requested", "Add more detail");

    const edited = await service.updateEntry("student", entry.id, {
      ...dailyInput,
      learning: "Expanded learning details",
    });
    expect(edited).toMatchObject({
      status: "draft",
      advisorDecision: null,
      supervisorDecision: null,
      submittedAt: null,
    });
  });

  test("rejects an unassigned reviewer", async () => {
    const repository = memoryRepository();
    const service = new CwieService(repository);
    const entry = await service.createEntry("student", dailyInput);
    await service.submitEntry("student", entry.id);
    await expect(service.reviewEntry("outsider", entry.id, "approved")).rejects.toMatchObject({
      statusCode: 403,
      code: "CWIE_REVIEWER_REQUIRED",
    });
  });

  test("requires an actionable comment when requesting revision", async () => {
    const repository = memoryRepository();
    const service = new CwieService(repository);
    const entry = await service.createEntry("student", dailyInput);
    await service.submitEntry("student", entry.id);
    await expect(
      service.reviewEntry("advisor", entry.id, "revision_requested"),
    ).rejects.toMatchObject({ statusCode: 422, code: "CWIE_REVIEW_COMMENT_REQUIRED" });
  });

  test("allows only the assigned advisor to schedule and complete supervision visits", async () => {
    const repository = memoryRepository();
    const service = new CwieService(repository, () => now);
    await expect(service.createVisit("supervisor", visitInput)).rejects.toMatchObject({
      statusCode: 403,
      code: "CWIE_ADVISOR_REQUIRED",
    });
    const visit = await service.createVisit("advisor", visitInput);
    const completed = await service.saveVisitReport("advisor", visit.id, {
      visitedAt: now,
      workObserved: "Observed the assigned software project",
      studentProgress: "The student is progressing according to plan",
      issuesFound: "Requirements changed during the week",
      solutionsAgreed: "Document and confirm the revised scope",
      recommendations: "Continue weekly communication with the supervisor",
    });
    expect(completed.status).toBe("completed");
    await expect(
      service.saveVisitReport("advisor", visit.id, {
        visitedAt: now,
        workObserved: "Attempted replacement report",
        studentProgress: "Attempted replacement progress",
        issuesFound: "Attempted replacement issue",
        solutionsAgreed: "Attempted replacement solution",
        recommendations: "Attempted replacement recommendation",
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: "CWIE_VISIT_COMPLETED" });
  });

  test("requires both advisor acknowledgement and supervisor certification for a monthly summary", async () => {
    const repository = memoryRepository();
    const service = new CwieService(repository, () => now);
    const summary = await service.createSummary("student", monthlyInput);
    await service.submitSummary("student", summary.id);
    expect(
      (await service.reviewSummary("supervisor", summary.id, "approved", "Certified")).status,
    ).toBe("submitted");
    expect(
      (await service.reviewSummary("advisor", summary.id, "approved", "Acknowledged")).status,
    ).toBe("approved");
  });

  test("rejects CWIE records outside the placement period", async () => {
    const service = new CwieService(memoryRepository());
    await expect(
      service.createEntry("student", { ...dailyInput, workDate: "2027-01-01" }),
    ).rejects.toMatchObject({ statusCode: 422, code: "CWIE_DATE_OUTSIDE_PLACEMENT" });
  });

  test("denies workspace access to users outside the assigned placement", async () => {
    await expect(
      new CwieService(memoryRepository()).getWorkspace("outsider", "placement"),
    ).rejects.toMatchObject({ statusCode: 403, code: "PLACEMENT_ACCESS_REQUIRED" });
  });
});

const dailyInput = {
  type: "daily_log" as const,
  placementId: "placement",
  workDate: "2026-06-15",
  activities: "Implemented and tested the assigned module",
  learning: "Learned how to validate the API contract",
  problems: "A test fixture was incomplete",
  solutions: "Added the missing fixture data",
  hoursWorked: 8,
};

const visitInput = {
  placementId: "placement",
  visitNumber: 1,
  scheduledAt: now,
  mode: "onsite" as const,
  location: "Company office",
  notes: "Meet the workplace supervisor",
};

const monthlyInput = {
  placementId: "placement",
  month: "2026-06",
  summary: "Completed the first implementation milestone",
  achievements: "Delivered the planned API and automated tests",
  challenges: "Clarified changing requirements with the team",
  nextMonthPlan: "Complete the client integration and verification",
  totalHours: 120,
};

function memoryRepository(): CwieRepository {
  const placement: CwiePlacement = {
    id: "placement",
    studentUserId: "student",
    advisorUserId: "advisor",
    supervisorUserId: "supervisor",
    startDate: new Date("2026-05-01T00:00:00.000Z"),
    endDate: new Date("2026-09-30T00:00:00.000Z"),
    status: "active",
  };
  const entries: CwieEntryRecord[] = [];
  const visits: CwieVisitRecord[] = [];
  const summaries: CwieMonthlySummaryRecord[] = [];
  return {
    async findPlacement(id) {
      return id === placement.id ? placement : undefined;
    },
    async findEntry(id) {
      return entries.find((item) => item.id === id);
    },
    async createEntry(input) {
      if (
        entries.some(
          (item) =>
            item.placementId === input.placementId &&
            item.type === input.type &&
            ((item.workDate && item.workDate === input.workDate) ||
              (item.periodStart && item.periodStart === input.periodStart)),
        )
      )
        return undefined;
      const record = entryRecord({ ...input, id: `entry-${entries.length + 1}` });
      entries.push(record);
      return record;
    },
    async updateEntry(id, changes) {
      const record = entries.find((item) => item.id === id)!;
      Object.assign(record, changes);
      return record;
    },
    async listEntries(placementId) {
      return entries.filter((item) => item.placementId === placementId);
    },
    async findVisit(id) {
      return visits.find((item) => item.id === id);
    },
    async createVisit(input) {
      if (
        visits.some(
          (item) =>
            item.placementId === input.placementId && item.visitNumber === input.visitNumber,
        )
      )
        return undefined;
      const record: CwieVisitRecord = {
        id: `visit-${visits.length + 1}`,
        status: "scheduled",
        visitedAt: null,
        workObserved: null,
        studentProgress: null,
        issuesFound: null,
        solutionsAgreed: null,
        recommendations: null,
        location: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
        ...input,
      };
      visits.push(record);
      return record;
    },
    async updateVisit(id, changes) {
      const record = visits.find((item) => item.id === id)!;
      Object.assign(record, changes);
      return record;
    },
    async listVisits(placementId) {
      return visits.filter((item) => item.placementId === placementId);
    },
    async findSummary(id) {
      return summaries.find((item) => item.id === id);
    },
    async createSummary(input) {
      if (
        summaries.some(
          (item) => item.placementId === input.placementId && item.month === input.month,
        )
      )
        return undefined;
      const record = summaryRecord({ ...input, id: `summary-${summaries.length + 1}` });
      summaries.push(record);
      return record;
    },
    async updateSummary(id, changes) {
      const record = summaries.find((item) => item.id === id)!;
      Object.assign(record, changes);
      return record;
    },
    async listSummaries(placementId) {
      return summaries.filter((item) => item.placementId === placementId);
    },
  };
}

function entryRecord(
  input: Pick<CwieEntryRecord, "id" | "placementId" | "studentUserId" | "type"> &
    Partial<CwieEntryRecord>,
): CwieEntryRecord {
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
    status: "draft",
    advisorDecision: null,
    advisorComment: null,
    advisorReviewedByUserId: null,
    advisorReviewedAt: null,
    supervisorDecision: null,
    supervisorComment: null,
    supervisorReviewedByUserId: null,
    supervisorReviewedAt: null,
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}

function summaryRecord(
  input: Pick<
    CwieMonthlySummaryRecord,
    | "id"
    | "placementId"
    | "studentUserId"
    | "month"
    | "summary"
    | "achievements"
    | "challenges"
    | "nextMonthPlan"
    | "totalHours"
  >,
): CwieMonthlySummaryRecord {
  return {
    ...input,
    status: "draft",
    advisorDecision: null,
    advisorComment: null,
    advisorReviewedByUserId: null,
    advisorReviewedAt: null,
    supervisorDecision: null,
    supervisorComment: null,
    supervisorReviewedByUserId: null,
    supervisorReviewedAt: null,
    submittedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
