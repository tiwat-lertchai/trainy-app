import { describe, expect, test } from "bun:test";
import { AppError } from "../../lib/app-error";
import type {
  ApprovalRecord,
  InternshipRequestRepository,
  RequestInsert,
  RequestWithApprovals,
} from "./internship-request.repository";
import { InternshipRequestService } from "./internship-request.service";
import { internshipRequestSteps, type InternshipRequestStep } from "./internship-request.schema";

type Membership = { role: string; status: "active" | "suspended" };
type MajorContext = { id: string; organizationId: string; programChairUserId: string | null };
type OrgRow = { id: string; type: "university" | "company"; status: "active" | "inactive" };

const now = new Date("2026-08-29T00:00:00.000Z");

function approvals(
  overrides: Partial<Record<InternshipRequestStep, Partial<ApprovalRecord>>> = {},
) {
  return internshipRequestSteps.map((step): ApprovalRecord => ({
    id: `${step}-approval`,
    requestId: "request-1",
    step,
    reviewerUserId: step === "advisor" ? "advisor-1" : step === "program_chair" ? "chair-1" : null,
    decision: "pending",
    note: null,
    decidedAt: null,
    ...overrides[step],
  }));
}

function request(overrides: Partial<RequestWithApprovals> = {}): RequestWithApprovals {
  return {
    id: "request-1",
    studentUserId: "student-1",
    universityOrganizationId: "university",
    academicMajorId: "major-1",
    type: "regular",
    companyOrganizationId: "company",
    companyNameProposed: null,
    companyContactName: null,
    companyContactEmail: null,
    companyContactPhone: null,
    positionTitle: "Frontend Intern",
    description: "Build things.",
    proposedStartDate: new Date("2026-10-01"),
    proposedEndDate: new Date("2027-01-31"),
    advisorUserId: "advisor-1",
    status: "submitted",
    revisionNote: null,
    createdAt: now,
    updatedAt: now,
    approvals: approvals(),
    ...overrides,
  };
}

class FakeRepository implements InternshipRequestRepository {
  requests: RequestWithApprovals[] = [];
  memberships = new Map<string, Membership>();
  majors = new Map<string, MajorContext>([
    ["major-1", { id: "major-1", organizationId: "university", programChairUserId: "chair-1" }],
  ]);
  organizations = new Map<string, OrgRow>([
    ["company", { id: "company", type: "company", status: "active" }],
  ]);

  key(organizationId: string, userId: string) {
    return `${organizationId}:${userId}`;
  }
  setMembership(
    organizationId: string,
    userId: string,
    role: string,
    status: Membership["status"] = "active",
  ) {
    this.memberships.set(this.key(organizationId, userId), { role, status });
  }

  async findMajorContext(majorId: string) {
    return this.majors.get(majorId);
  }
  async findOrganization(id: string) {
    return this.organizations.get(id);
  }
  async findMembership(organizationId: string, userId: string) {
    return this.memberships.get(this.key(organizationId, userId));
  }
  async listActiveAdvisors(organizationId: string) {
    return [...this.memberships.entries()]
      .filter(
        ([key, membership]) =>
          key.startsWith(`${organizationId}:`) &&
          membership.role === "advisor" &&
          membership.status === "active",
      )
      .map(([key]) => ({ userId: key.split(":")[1]!, name: key.split(":")[1]! }));
  }
  async findById(id: string) {
    return this.requests.find((item) => item.id === id);
  }
  async listMine(studentUserId: string) {
    return this.requests.filter((item) => item.studentUserId === studentUserId);
  }
  async listActive() {
    return this.requests.filter((item) =>
      ["submitted", "revision_requested"].includes(item.status),
    );
  }
  async create(input: Parameters<InternshipRequestRepository["create"]>[0]) {
    const record = request({
      ...(input.request as RequestInsert),
      approvals: internshipRequestSteps.map((step): ApprovalRecord => ({
        id: `${step}-approval`,
        requestId: "request-1",
        step,
        reviewerUserId: input.reviewers[step] ?? null,
        decision: "pending",
        note: null,
        decidedAt: null,
      })),
    });
    this.requests.push(record);
    return record;
  }
  async decideStep(input: Parameters<InternshipRequestRepository["decideStep"]>[0]) {
    const record = this.requests.find((item) => item.id === input.requestId);
    if (!record) throw new Error("Missing request");
    const approval = record.approvals.find((item) => item.step === input.step);
    if (!approval || approval.decision !== "pending") throw new Error("Already decided");
    approval.decision = input.decision;
    approval.reviewerUserId = input.reviewerUserId;
    approval.note = input.note ?? null;
    approval.decidedAt = now;
    if (input.decision === "rejected") record.status = "rejected";
    else if (input.decision === "revision_requested") {
      record.status = "revision_requested";
      record.revisionNote = input.note ?? null;
    } else if (input.decision === "approved" && input.step === "center") {
      record.status = "approved";
    }
    return record;
  }
  async resubmit(requestId: string, updates?: Partial<RequestInsert>) {
    const record = this.requests.find((item) => item.id === requestId);
    if (!record || record.status !== "revision_requested") throw new Error("Not revisable");
    Object.assign(record, updates);
    record.status = "submitted";
    record.revisionNote = null;
    for (const approval of record.approvals) {
      approval.decision = "pending";
      approval.note = null;
      approval.decidedAt = null;
      if (approval.step === "center") approval.reviewerUserId = null;
    }
    return record;
  }
  async cancel(requestId: string) {
    const record = this.requests.find((item) => item.id === requestId);
    if (!record || !["submitted", "revision_requested"].includes(record.status))
      throw new Error("Not cancellable");
    record.status = "cancelled";
    return record;
  }
}

function service() {
  const repository = new FakeRepository();
  repository.setMembership("university", "student-1", "student");
  repository.setMembership("university", "advisor-1", "advisor");
  repository.setMembership("university", "coordinator-1", "coordinator");
  return { repository, service: new InternshipRequestService(repository) };
}

const baseCreateInput = {
  actorUserId: "student-1",
  universityOrganizationId: "university",
  academicMajorId: "major-1",
  type: "regular" as const,
  positionTitle: "Frontend Intern",
  description: "Build things for the summer.",
  proposedStartDate: new Date("2026-10-01"),
  proposedEndDate: new Date("2027-01-31"),
  advisorUserId: "advisor-1",
  companyOrganizationId: "company",
};

describe("InternshipRequestService.createRequest", () => {
  test("creates a request with all three approval steps resolved up front", async () => {
    const { service: svc } = service();
    const record = await svc.createRequest(baseCreateInput);
    expect(record.approvals).toHaveLength(3);
    expect(record.approvals.find((a) => a.step === "advisor")?.reviewerUserId).toBe("advisor-1");
    expect(record.approvals.find((a) => a.step === "program_chair")?.reviewerUserId).toBe(
      "chair-1",
    );
    expect(record.approvals.find((a) => a.step === "center")?.reviewerUserId).toBeNull();
  });

  test("rejects a request from someone who isn't a student at that university", async () => {
    const { service: svc } = service();
    await expect(
      svc.createRequest({ ...baseCreateInput, actorUserId: "outsider" }),
    ).rejects.toThrow(AppError);
  });

  test("rejects a request when the major has no program chair assigned", async () => {
    const { repository, service: svc } = service();
    repository.majors.set("major-1", {
      id: "major-1",
      organizationId: "university",
      programChairUserId: null,
    });
    await expect(svc.createRequest(baseCreateInput)).rejects.toMatchObject({
      code: "PROGRAM_CHAIR_NOT_ASSIGNED",
    });
  });

  test("rejects a company organization that is not an active company", async () => {
    const { repository, service: svc } = service();
    repository.organizations.set("company", { id: "company", type: "company", status: "inactive" });
    await expect(svc.createRequest(baseCreateInput)).rejects.toMatchObject({
      code: "COMPANY_NOT_FOUND",
    });
  });
});

describe("InternshipRequestService.reviewStep", () => {
  test("lets the assigned advisor approve the advisor step", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    const record = await svc.reviewStep({
      actorUserId: "advisor-1",
      requestId: created.id,
      step: "advisor",
      decision: "approved",
    });
    expect(record.approvals.find((a) => a.step === "advisor")?.decision).toBe("approved");
  });

  test("rejects reviewing program_chair before advisor has approved", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    await expect(
      svc.reviewStep({
        actorUserId: "chair-1",
        requestId: created.id,
        step: "program_chair",
        decision: "approved",
      }),
    ).rejects.toMatchObject({ code: "STEP_OUT_OF_ORDER" });
  });

  test("rejects a reviewer who isn't the assigned advisor", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    await expect(
      svc.reviewStep({
        actorUserId: "someone-else",
        requestId: created.id,
        step: "advisor",
        decision: "approved",
      }),
    ).rejects.toMatchObject({ code: "STEP_REVIEWER_REQUIRED" });
  });

  test("lets any coordinator claim and approve the center step", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    await svc.reviewStep({
      actorUserId: "advisor-1",
      requestId: created.id,
      step: "advisor",
      decision: "approved",
    });
    repository.setMembership("university", "chair-1", "advisor");
    await svc.reviewStep({
      actorUserId: "chair-1",
      requestId: created.id,
      step: "program_chair",
      decision: "approved",
    });
    const record = await svc.reviewStep({
      actorUserId: "coordinator-1",
      requestId: created.id,
      step: "center",
      decision: "approved",
    });
    expect(record.status).toBe("approved");
    expect(record.approvals.find((a) => a.step === "center")?.reviewerUserId).toBe("coordinator-1");
  });

  test("rejects the whole request when any step is rejected", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    const record = await svc.reviewStep({
      actorUserId: "advisor-1",
      requestId: created.id,
      step: "advisor",
      decision: "rejected",
      note: "Not a good fit",
    });
    expect(record.status).toBe("rejected");
  });

  test("sends the request to revision_requested and keeps it out of the reviewer's queue", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    const record = await svc.reviewStep({
      actorUserId: "advisor-1",
      requestId: created.id,
      step: "advisor",
      decision: "revision_requested",
      note: "Fix the dates",
    });
    expect(record.status).toBe("revision_requested");
    expect(record.revisionNote).toBe("Fix the dates");
  });
});

describe("InternshipRequestService.resubmit / cancelRequest", () => {
  test("resubmitting resets every approval step back to pending", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    await svc.reviewStep({
      actorUserId: "advisor-1",
      requestId: created.id,
      step: "advisor",
      decision: "revision_requested",
      note: "Fix the dates",
    });
    const record = await svc.resubmit("student-1", created.id);
    expect(record.status).toBe("submitted");
    expect(record.approvals.every((a) => a.decision === "pending")).toBe(true);
  });

  test("only the requesting student can resubmit", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    await svc.reviewStep({
      actorUserId: "advisor-1",
      requestId: created.id,
      step: "advisor",
      decision: "revision_requested",
      note: "Fix the dates",
    });
    await expect(svc.resubmit("someone-else", created.id)).rejects.toMatchObject({
      code: "STUDENT_ONLY",
    });
  });

  test("lets the student cancel their own pending request", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    const record = await svc.cancelRequest("student-1", created.id);
    expect(record.status).toBe("cancelled");
  });
});

describe("InternshipRequestService.listForReview", () => {
  test("shows the advisor their own pending step but not an unclaimed center step", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    const advisorView = await svc.listForReview("advisor-1");
    expect(advisorView).toHaveLength(1);
    const coordinatorView = await svc.listForReview("coordinator-1");
    expect(coordinatorView).toHaveLength(0);
  });

  test("shows a coordinator the request once it reaches the unclaimed center step", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createRequest(baseCreateInput);
    await svc.reviewStep({
      actorUserId: "advisor-1",
      requestId: created.id,
      step: "advisor",
      decision: "approved",
    });
    repository.setMembership("university", "chair-1", "advisor");
    await svc.reviewStep({
      actorUserId: "chair-1",
      requestId: created.id,
      step: "program_chair",
      decision: "approved",
    });
    const coordinatorView = await svc.listForReview("coordinator-1");
    expect(coordinatorView).toHaveLength(1);
  });
});

describe("InternshipRequestService.listAdvisorOptions", () => {
  test("lists active advisors at the caller's own university", async () => {
    const { service: svc } = service();
    const options = await svc.listAdvisorOptions("student-1", "university");
    expect(options.map((o) => o.userId)).toEqual(["advisor-1"]);
  });

  test("rejects a caller with no membership at that university", async () => {
    const { service: svc } = service();
    await expect(svc.listAdvisorOptions("outsider", "university")).rejects.toMatchObject({
      code: "ORGANIZATION_ACCESS_REQUIRED",
    });
  });
});
