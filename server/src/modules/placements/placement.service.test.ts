import { describe, expect, test } from "bun:test";
import type {
  AcceptedApplication,
  ApprovedRequest,
  PlacementMembership,
  PlacementRecord,
  PlacementRepository,
} from "./placement.repository";
import { PlacementService } from "./placement.service";

describe("PlacementService", () => {
  test("creates a pending placement from an accepted application", async () => {
    const repository = seededRepository();
    const record = await new PlacementService(repository).createPlacement({
      actorUserId: "coordinator",
      applicationId: "application",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2027-01-31"),
    });
    expect(record).toMatchObject({
      status: "pending",
      studentUserId: "student",
    });
  });

  test("rejects a placement from a non-accepted application", async () => {
    const repository = seededRepository();
    repository.application.status = "under_review";
    expect(
      new PlacementService(repository).createPlacement({
        actorUserId: "coordinator",
        applicationId: "application",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2027-01-31"),
      }),
    ).rejects.toMatchObject({ code: "APPLICATION_NOT_ACCEPTED" });
  });

  test("rejects an invalid placement date range", async () => {
    const repository = seededRepository();
    expect(
      new PlacementService(repository).createPlacement({
        actorUserId: "coordinator",
        applicationId: "application",
        startDate: new Date("2027-01-31"),
        endDate: new Date("2026-10-01"),
      }),
    ).rejects.toMatchObject({ code: "INVALID_PLACEMENT_DATES" });
  });

  test("rejects duplicate placements", async () => {
    const repository = seededRepository();
    repository.record = placementRecord();
    expect(
      new PlacementService(repository).createPlacement({
        actorUserId: "coordinator",
        applicationId: "application",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2027-01-31"),
      }),
    ).rejects.toMatchObject({ code: "PLACEMENT_CONFLICT" });
  });

  test("creates a placement from an approved internship request", async () => {
    const repository = seededRepository();
    const record = await new PlacementService(repository).createPlacementFromRequest({
      actorUserId: "coordinator",
      requestId: "request",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2027-01-31"),
    });
    expect(record).toMatchObject({
      status: "pending",
      studentUserId: "student",
      requestId: "request",
      applicationId: null,
    });
  });

  test("rejects a placement from a request whose company hasn't joined yet", async () => {
    const repository = seededRepository();
    repository.request.companyOrganizationId = null;
    expect(
      new PlacementService(repository).createPlacementFromRequest({
        actorUserId: "coordinator",
        requestId: "request",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2027-01-31"),
      }),
    ).rejects.toMatchObject({ code: "REQUEST_COMPANY_NOT_RESOLVED" });
  });

  test("rejects a placement from a request that isn't approved", async () => {
    const repository = seededRepository();
    repository.request.status = "submitted";
    expect(
      new PlacementService(repository).createPlacementFromRequest({
        actorUserId: "coordinator",
        requestId: "request",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2027-01-31"),
      }),
    ).rejects.toMatchObject({ code: "REQUEST_NOT_APPROVED" });
  });

  test("requires an advisor from the placement university", async () => {
    const repository = seededRepository();
    repository.record = placementRecord();
    expect(
      new PlacementService(repository).assignAdvisor("coordinator", "placement", "outsider"),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
  });

  test("requires both assignments before activation", async () => {
    const repository = seededRepository();
    repository.record = placementRecord({ advisorUserId: "advisor" });
    expect(
      new PlacementService(repository).updateStatus("coordinator", "placement", "active"),
    ).rejects.toMatchObject({ code: "PLACEMENT_ASSIGNMENTS_REQUIRED" });
  });

  test("activates a fully assigned placement", async () => {
    const repository = seededRepository();
    repository.record = placementRecord({
      advisorUserId: "advisor",
      supervisorUserId: "supervisor",
    });
    const record = await new PlacementService(repository).updateStatus(
      "coordinator",
      "placement",
      "active",
    );
    expect(record.status).toBe("active");
  });

  test("prevents reopening a completed placement", async () => {
    const repository = seededRepository();
    repository.record = placementRecord({ status: "completed" });
    expect(
      new PlacementService(repository).updateStatus("coordinator", "placement", "active"),
    ).rejects.toMatchObject({ code: "INVALID_PLACEMENT_TRANSITION" });
  });
});

class MemoryPlacementRepository implements PlacementRepository {
  application: AcceptedApplication = {
    id: "application",
    internshipId: "internship",
    studentUserId: "student",
    universityOrganizationId: "university",
    companyOrganizationId: "company",
    status: "accepted",
  };
  request: ApprovedRequest = {
    id: "request",
    studentUserId: "student",
    universityOrganizationId: "university",
    companyOrganizationId: "company",
    status: "approved",
  };
  memberships: PlacementMembership[] = [];
  record?: PlacementRecord;

  async findApplication(id: string) {
    return id === this.application.id ? this.application : undefined;
  }
  async findRequest(id: string) {
    return id === this.request.id ? this.request : undefined;
  }
  async findMembership(organizationId: string, userId: string) {
    return this.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === userId,
    );
  }
  async findByApplication(applicationId: string) {
    return this.record?.applicationId === applicationId ? this.record : undefined;
  }
  async findByRequest(requestId: string) {
    return this.record?.requestId === requestId ? this.record : undefined;
  }
  async findById(id: string) {
    return this.record?.id === id ? this.record : undefined;
  }
  async create(input: Parameters<PlacementRepository["create"]>[0]) {
    if (this.record) return undefined;
    this.record =
      "applicationId" in input
        ? placementRecord(input)
        : placementRecord({ ...input, applicationId: null, internshipId: null });
    return this.record;
  }
  async update(id: string, changes: Parameters<PlacementRepository["update"]>[1]) {
    if (!this.record || this.record.id !== id) throw new Error("Missing placement");
    Object.assign(this.record, changes);
    return this.record;
  }
  async listForStudent(userId: string) {
    return this.record?.studentUserId === userId ? [this.record] : [];
  }
  async listForOrganization(organizationId: string) {
    return this.record &&
      [this.record.universityOrganizationId, this.record.companyOrganizationId].includes(
        organizationId,
      )
      ? [this.record]
      : [];
  }
}

function seededRepository() {
  const repository = new MemoryPlacementRepository();
  repository.memberships.push(
    membership("coordinator", "university", "coordinator", "university"),
    membership("advisor", "university", "advisor", "university"),
    membership("company-admin", "company", "company_admin", "company"),
    membership("supervisor", "company", "supervisor", "company"),
  );
  return repository;
}

function membership(
  userId: string,
  organizationId: string,
  role: PlacementMembership["role"],
  organizationType: PlacementMembership["organizationType"],
): PlacementMembership {
  return { userId, organizationId, organizationType, role, status: "active" };
}

function placementRecord(overrides: Partial<PlacementRecord> = {}): PlacementRecord {
  const now = new Date("2026-08-27");
  return {
    id: "placement",
    applicationId: "application",
    internshipId: "internship",
    requestId: null,
    studentUserId: "student",
    universityOrganizationId: "university",
    companyOrganizationId: "company",
    advisorUserId: null,
    supervisorUserId: null,
    startDate: new Date("2026-10-01"),
    endDate: new Date("2027-01-31"),
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
