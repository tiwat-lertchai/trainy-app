import { AppError } from "../../lib/app-error";
import type {
  PlacementMembership,
  PlacementRecord,
  PlacementRepository,
} from "./placement.repository";
import type { PlacementStatus } from "./placement.schema";

const universityManagerRoles = ["university_admin", "coordinator"] as const;

export class PlacementService {
  constructor(private readonly repository: PlacementRepository) {}

  async createPlacement(input: {
    actorUserId: string;
    applicationId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<PlacementRecord> {
    if (input.endDate <= input.startDate) {
      throw new AppError("End date must be after start date", 422, "INVALID_PLACEMENT_DATES");
    }
    const application = await this.repository.findApplication(input.applicationId);
    if (!application) throw notFound();
    if (application.status !== "accepted") {
      throw new AppError(
        "Only an accepted application can become a placement",
        409,
        "APPLICATION_NOT_ACCEPTED",
      );
    }
    await this.requireMembership(
      input.actorUserId,
      application.universityOrganizationId,
      universityManagerRoles,
    );
    if (await this.repository.findByApplication(application.id)) {
      throw new AppError("Application already has a placement", 409, "PLACEMENT_CONFLICT");
    }

    const record = await this.repository.create({
      applicationId: application.id,
      internshipId: application.internshipId,
      studentUserId: application.studentUserId,
      universityOrganizationId: application.universityOrganizationId,
      companyOrganizationId: application.companyOrganizationId,
      startDate: input.startDate,
      endDate: input.endDate,
    });
    if (!record)
      throw new AppError("Application already has a placement", 409, "PLACEMENT_CONFLICT");
    return record;
  }

  async assignAdvisor(actorUserId: string, placementId: string, advisorUserId: string) {
    const record = await this.requirePendingPlacement(placementId);
    await this.requireMembership(
      actorUserId,
      record.universityOrganizationId,
      universityManagerRoles,
    );
    await this.requireMembership(advisorUserId, record.universityOrganizationId, ["advisor"]);
    return this.repository.update(record.id, { advisorUserId });
  }

  async assignSupervisor(actorUserId: string, placementId: string, supervisorUserId: string) {
    const record = await this.requirePendingPlacement(placementId);
    await this.requireMembership(actorUserId, record.companyOrganizationId, ["company_admin"]);
    await this.requireMembership(supervisorUserId, record.companyOrganizationId, ["supervisor"]);
    return this.repository.update(record.id, { supervisorUserId });
  }

  async updateStatus(
    actorUserId: string,
    placementId: string,
    status: Exclude<PlacementStatus, "pending">,
  ) {
    const record = await this.requirePlacement(placementId);
    await this.requireMembership(
      actorUserId,
      record.universityOrganizationId,
      universityManagerRoles,
    );
    this.assertTransition(record, status);
    return this.repository.update(record.id, { status });
  }

  listMyPlacements(userId: string) {
    return this.repository.listForStudent(userId);
  }

  async listOrganizationPlacements(actorUserId: string, organizationId: string) {
    await this.requireMembership(actorUserId, organizationId, [
      "university_admin",
      "coordinator",
      "advisor",
      "company_admin",
      "supervisor",
    ]);
    return this.repository.listForOrganization(organizationId);
  }

  private async requirePendingPlacement(id: string) {
    const record = await this.requirePlacement(id);
    if (record.status !== "pending") {
      throw new AppError(
        "Assignments can only change while placement is pending",
        409,
        "PLACEMENT_NOT_PENDING",
      );
    }
    return record;
  }

  private async requirePlacement(id: string) {
    const record = await this.repository.findById(id);
    if (!record) throw notFound();
    return record;
  }

  private async requireMembership(
    userId: string,
    organizationId: string,
    roles: readonly PlacementMembership["role"][],
  ) {
    const membership = await this.repository.findMembership(organizationId, userId);
    if (membership?.status !== "active" || !roles.includes(membership.role)) {
      throw new AppError(
        "Required organization access was not found",
        403,
        "ORGANIZATION_ACCESS_REQUIRED",
      );
    }
    return membership;
  }

  private assertTransition(record: PlacementRecord, next: Exclude<PlacementStatus, "pending">) {
    const transitions: Record<PlacementStatus, readonly PlacementStatus[]> = {
      pending: ["active", "cancelled"],
      active: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    if (!transitions[record.status].includes(next)) {
      throw new AppError(
        `Cannot change placement from ${record.status} to ${next}`,
        409,
        "INVALID_PLACEMENT_TRANSITION",
      );
    }
    if (next === "active" && (!record.advisorUserId || !record.supervisorUserId)) {
      throw new AppError(
        "Advisor and supervisor are required before activation",
        409,
        "PLACEMENT_ASSIGNMENTS_REQUIRED",
      );
    }
  }
}

function notFound() {
  return new AppError("Placement source was not found", 404, "PLACEMENT_NOT_FOUND");
}
