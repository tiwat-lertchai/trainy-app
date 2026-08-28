import { AppError } from "../../lib/app-error";
import type {
  MembershipRecord,
  OrganizationRecord,
  OrganizationRepository,
} from "./organization.repository";
import type { MembershipStatus, OrganizationRole, OrganizationType } from "./organization.schema";

const rolesByOrganizationType: Record<OrganizationType, readonly OrganizationRole[]> = {
  university: ["university_admin", "coordinator", "advisor", "student"],
  company: ["company_admin", "supervisor"],
};

const adminRoleByOrganizationType: Record<OrganizationType, OrganizationRole> = {
  university: "university_admin",
  company: "company_admin",
};

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async createOrganization(input: {
    actorUserId: string;
    type: OrganizationType;
    name: string;
    slug: string;
  }): Promise<OrganizationRecord> {
    if (await this.repository.findBySlug(input.slug)) {
      throw new AppError("Organization slug is already in use", 409, "ORGANIZATION_SLUG_CONFLICT");
    }

    return this.repository.createWithOwner({
      type: input.type,
      name: input.name,
      slug: input.slug,
      ownerUserId: input.actorUserId,
      ownerRole: adminRoleByOrganizationType[input.type],
    });
  }

  listOrganizations(actorUserId: string) {
    return this.repository.listForUser(actorUserId);
  }

  async getOrganization(actorUserId: string, organizationId: string) {
    const organization = await this.repository.findForUser(organizationId, actorUserId);

    if (!organization) {
      // Returning 404 avoids revealing whether another tenant's record exists.
      throw new AppError("Organization was not found", 404, "ORGANIZATION_NOT_FOUND");
    }

    return organization;
  }

  async listMemberships(actorUserId: string, organizationId: string) {
    await this.requireAdmin(actorUserId, organizationId);
    return this.repository.listMemberships(organizationId);
  }

  async addMembership(input: {
    actorUserId: string;
    organizationId: string;
    userId: string;
    role: OrganizationRole;
  }): Promise<MembershipRecord> {
    const organization = await this.requireAdmin(input.actorUserId, input.organizationId);

    this.assertRoleMatchesOrganization(organization.type, input.role);

    if (!(await this.repository.userExists(input.userId))) {
      throw new AppError("User was not found", 404, "USER_NOT_FOUND");
    }

    if (await this.repository.findMembership(input.organizationId, input.userId)) {
      throw new AppError(
        "User is already a member of this organization",
        409,
        "MEMBERSHIP_CONFLICT",
      );
    }

    return this.repository.addMembership({
      organizationId: input.organizationId,
      userId: input.userId,
      role: input.role,
    });
  }

  async updateMembership(input: {
    actorUserId: string;
    organizationId: string;
    membershipId: string;
    role?: OrganizationRole;
    status?: MembershipStatus;
  }) {
    const organization = await this.requireAdmin(input.actorUserId, input.organizationId);
    const target = await this.repository.findMembershipById(
      input.organizationId,
      input.membershipId,
    );

    if (!target) {
      throw new AppError("Membership was not found", 404, "MEMBERSHIP_NOT_FOUND");
    }

    if (input.role) {
      this.assertRoleMatchesOrganization(organization.type, input.role);
    }

    const adminRole = adminRoleByOrganizationType[organization.type];
    const removesActiveAdmin =
      target.role === adminRole &&
      target.status === "active" &&
      ((input.role !== undefined && input.role !== adminRole) || input.status === "suspended");

    if (
      removesActiveAdmin &&
      (await this.repository.countActiveAdmins(organization.id, adminRole)) <= 1
    ) {
      throw new AppError(
        "The last active organization admin cannot be removed",
        409,
        "LAST_ADMIN_REQUIRED",
      );
    }

    return this.repository.updateMembership(input.membershipId, {
      role: input.role,
      status: input.status,
    });
  }

  private async requireAdmin(
    actorUserId: string,
    organizationId: string,
  ): Promise<OrganizationRecord> {
    const organization = await this.repository.findForUser(organizationId, actorUserId);

    if (!organization) {
      throw new AppError("Organization was not found", 404, "ORGANIZATION_NOT_FOUND");
    }

    const membership = await this.repository.findMembership(organizationId, actorUserId);
    const adminRole = adminRoleByOrganizationType[organization.type];

    if (membership?.status !== "active" || membership.role !== adminRole) {
      throw new AppError(
        "Organization administrator access is required",
        403,
        "ORGANIZATION_ADMIN_REQUIRED",
      );
    }

    return organization;
  }

  private assertRoleMatchesOrganization(
    organizationType: OrganizationType,
    role: OrganizationRole,
  ) {
    if (!rolesByOrganizationType[organizationType].includes(role)) {
      throw new AppError(
        `Role ${role} is not valid for a ${organizationType}`,
        422,
        "INVALID_ORGANIZATION_ROLE",
      );
    }
  }
}
