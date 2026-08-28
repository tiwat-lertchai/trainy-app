import { describe, expect, it } from "bun:test";
import { AppError } from "../../lib/app-error";
import type {
  OnboardingInsert,
  OnboardingRecord,
  OnboardingRepository,
} from "./onboarding.repository";
import { OnboardingService } from "./onboarding.service";

const now = new Date("2026-08-28T00:00:00.000Z");
const university = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "university" as const,
  name: "Trainy University",
  slug: "trainy-university",
  status: "active" as const,
  createdAt: now,
  updatedAt: now,
};
const company = {
  ...university,
  id: "22222222-2222-4222-8222-222222222222",
  type: "company" as const,
  name: "Trainy Company",
  slug: "trainy-company",
};

function request(values: Partial<OnboardingRecord> = {}): OnboardingRecord {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "applicant",
    requestedRole: "advisor",
    targetOrganizationId: university.id,
    profileData: { fullName: "Applicant" },
    proposedOrganization: null,
    status: "pending",
    reviewerUserId: null,
    reviewNote: null,
    submittedAt: now,
    reviewedAt: null,
    updatedAt: now,
    ...values,
  };
}

class FakeRepository implements OnboardingRepository {
  requests: OnboardingRecord[] = [];
  organizations = [university, company];
  memberships = new Map<
    string,
    {
      id: string;
      organizationId: string;
      userId: string;
      role: "university_admin" | "company_admin";
      status: "active";
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  staff = new Set<string>();

  async findForUser(userId: string) {
    return this.requests.find((item) => item.userId === userId);
  }
  async findById(id: string) {
    return this.requests.find((item) => item.id === id);
  }
  async findOrganization(id: string) {
    return this.organizations.find((item) => item.id === id);
  }
  async findActiveMembership(organizationId: string, userId: string) {
    return this.memberships.get(`${organizationId}:${userId}`);
  }
  async isPlatformStaff(userId: string) {
    return this.staff.has(userId);
  }
  async listPending() {
    return this.requests.filter((item) => item.status === "pending");
  }
  async listAvailableOrganizations() {
    return this.organizations.map(({ id, name, type }) => ({ id, name, type }));
  }
  async createPending(input: OnboardingInsert) {
    const created = request({
      ...input,
      id: crypto.randomUUID(),
      status: "pending",
    } as Partial<OnboardingRecord>);
    this.requests.push(created);
    return created;
  }
  async resubmit(requestId: string, input: OnboardingInsert) {
    const current = this.requests.find((item) => item.id === requestId)!;
    const updated = request({
      ...current,
      ...input,
      status: "pending",
      reviewerUserId: null,
      reviewNote: null,
      reviewedAt: null,
    } as Partial<OnboardingRecord>);
    this.requests = this.requests.map((item) => (item.id === requestId ? updated : item));
    return updated;
  }
  async createApprovedStudent(input: OnboardingInsert & { targetOrganizationId: string }) {
    const created = request({
      ...input,
      id: crypto.randomUUID(),
      status: "approved",
      reviewedAt: now,
    } as Partial<OnboardingRecord>);
    this.requests.push(created);
    return created;
  }
  async approve(input: { request: OnboardingRecord; reviewerUserId: string; note?: string }) {
    const updated = {
      ...input.request,
      status: "approved" as const,
      reviewerUserId: input.reviewerUserId,
      reviewNote: input.note ?? null,
      reviewedAt: now,
    };
    this.requests = this.requests.map((item) => (item.id === updated.id ? updated : item));
    return updated;
  }
  async recordDecision(input: {
    requestId: string;
    reviewerUserId: string;
    status: "rejected" | "revision_requested";
    note: string;
  }) {
    const current = this.requests.find((item) => item.id === input.requestId)!;
    const updated = {
      ...current,
      ...input,
      id: current.id,
      status: input.status,
      reviewNote: input.note,
      reviewedAt: now,
    };
    this.requests = this.requests.map((item) => (item.id === updated.id ? updated : item));
    return updated;
  }
}

const contact = {
  fullName: "Somchai Advisor",
  email: "somchai@example.ac.th",
  phone: "0812345678",
};

describe("OnboardingService", () => {
  it("auto-approves a student for an active university", async () => {
    const repository = new FakeRepository();
    const result = await new OnboardingService(repository).submit("student", {
      requestedRole: "student",
      targetOrganizationId: university.id,
      profile: {
        ...contact,
        studentId: "65001",
        faculty: "Engineering",
        major: "Software",
        yearLevel: "4",
      },
    });
    expect(result.status).toBe("approved");
  });

  it("keeps an advisor pending for university approval", async () => {
    const repository = new FakeRepository();
    const result = await new OnboardingService(repository).submit("advisor", {
      requestedRole: "advisor",
      targetOrganizationId: university.id,
      profile: { ...contact, faculty: "Engineering", department: "Computer Engineering" },
    });
    expect(result.status).toBe("pending");
  });

  it("does not allow a supervisor request against a university", async () => {
    const repository = new FakeRepository();
    await expect(
      new OnboardingService(repository).submit("supervisor", {
        requestedRole: "supervisor",
        targetOrganizationId: university.id,
        profile: { ...contact, department: "IT", jobTitle: "Lead" },
      }),
    ).rejects.toMatchObject({ code: "ONBOARDING_ORGANIZATION_NOT_FOUND" });
  });

  it("allows only the tenant admin to review advisor requests", async () => {
    const repository = new FakeRepository();
    repository.requests.push(request());
    repository.memberships.set(`${university.id}:admin`, {
      id: "membership",
      organizationId: university.id,
      userId: "admin",
      role: "university_admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await expect(
      new OnboardingService(repository).review("outsider", request().id, { decision: "approved" }),
    ).rejects.toMatchObject({ code: "ONBOARDING_REVIEW_FORBIDDEN" });
    await expect(
      new OnboardingService(repository).review("admin", request().id, { decision: "approved" }),
    ).resolves.toMatchObject({ status: "approved" });
  });

  it("requires CWIE staff and verified documents for a company", async () => {
    const repository = new FakeRepository();
    repository.staff.add("cwie");
    repository.requests.push(
      request({
        requestedRole: "company_admin",
        targetOrganizationId: null,
        proposedOrganization: {
          name: "New Company",
          slug: "new-company",
          registrationNumber: "0101",
        },
      }),
    );
    const service = new OnboardingService(repository);
    await expect(
      service.review("outsider", request().id, { decision: "approved", documentsVerified: true }),
    ).rejects.toMatchObject({ code: "ONBOARDING_REVIEW_FORBIDDEN" });
    await expect(
      service.review("cwie", request().id, { decision: "approved" }),
    ).rejects.toMatchObject({ code: "COMPANY_DOCUMENTS_NOT_VERIFIED" });
    await expect(
      service.review("cwie", request().id, { decision: "approved", documentsVerified: true }),
    ).resolves.toMatchObject({ status: "approved" });
  });

  it("requires a note when requesting revision", async () => {
    const repository = new FakeRepository();
    repository.staff.add("cwie");
    repository.requests.push(request({ requestedRole: "university_admin" }));
    await expect(
      new OnboardingService(repository).review("cwie", request().id, {
        decision: "revision_requested",
        note: "Please add an employee ID",
      }),
    ).resolves.toMatchObject({ status: "revision_requested" });
  });

  it("allows a revision-requested applicant to correct and resubmit", async () => {
    const repository = new FakeRepository();
    repository.requests.push(
      request({
        userId: "advisor",
        status: "revision_requested",
        reviewNote: "Add the department",
      }),
    );
    const result = await new OnboardingService(repository).submit("advisor", {
      requestedRole: "advisor",
      targetOrganizationId: university.id,
      profile: { ...contact, faculty: "Engineering", department: "Computer Engineering" },
    });
    expect(result).toMatchObject({ status: "pending", reviewNote: null, reviewerUserId: null });
  });
});
