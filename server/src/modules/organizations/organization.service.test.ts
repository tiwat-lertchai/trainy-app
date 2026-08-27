import { describe, expect, it } from "bun:test";
import { AppError } from "../../lib/app-error";
import type {
  MembershipRecord,
  OrganizationRecord,
  OrganizationRepository,
} from "./organization.repository";
import type {
  MembershipStatus,
  OrganizationRole,
} from "./organization.schema";
import { OrganizationService } from "./organization.service";

const now = new Date("2026-01-01T00:00:00.000Z");

function makeOrganization(
  values: Partial<OrganizationRecord> = {},
): OrganizationRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    type: "university",
    name: "Trainy University",
    slug: "trainy-university",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...values,
  };
}

function makeMembership(
  values: Partial<MembershipRecord> = {},
): MembershipRecord {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId: "11111111-1111-4111-8111-111111111111",
    userId: "admin-user",
    role: "university_admin",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...values,
  };
}

class FakeOrganizationRepository implements OrganizationRepository {
  organizations: OrganizationRecord[] = [];
  memberships: MembershipRecord[] = [];
  existingUsers = new Set(["admin-user", "advisor", "creator", "new-user"]);

  async createWithOwner(input: {
    type: "university" | "company";
    name: string;
    slug: string;
    ownerUserId: string;
    ownerRole: OrganizationRole;
  }) {
    const organization = makeOrganization({
      type: input.type,
      name: input.name,
      slug: input.slug,
    });
    this.organizations.push(organization);
    this.memberships.push(
      makeMembership({
        organizationId: organization.id,
        userId: input.ownerUserId,
        role: input.ownerRole,
      }),
    );
    return organization;
  }

  async findBySlug(slug: string) {
    return this.organizations.find((item) => item.slug === slug);
  }

  async userExists(userId: string) {
    return this.existingUsers.has(userId);
  }

  async findForUser(organizationId: string, userId: string) {
    const membership = this.memberships.find(
      (item) =>
        item.organizationId === organizationId &&
        item.userId === userId &&
        item.status === "active",
    );
    return membership
      ? this.organizations.find((item) => item.id === organizationId)
      : undefined;
  }

  async listForUser(userId: string) {
    return this.organizations.filter((item) =>
      this.memberships.some(
        (membership) =>
          membership.organizationId === item.id &&
          membership.userId === userId &&
          membership.status === "active",
      ),
    );
  }

  async findMembership(organizationId: string, userId: string) {
    return this.memberships.find(
      (item) =>
        item.organizationId === organizationId && item.userId === userId,
    );
  }

  async findMembershipById(organizationId: string, membershipId: string) {
    return this.memberships.find(
      (item) =>
        item.organizationId === organizationId && item.id === membershipId,
    );
  }

  async listMemberships(organizationId: string) {
    return this.memberships.filter(
      (item) => item.organizationId === organizationId,
    );
  }

  async addMembership(input: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
  }) {
    const membership = makeMembership({
      id: crypto.randomUUID(),
      ...input,
    });
    this.memberships.push(membership);
    return membership;
  }

  async updateMembership(
    membershipId: string,
    changes: { role?: OrganizationRole; status?: MembershipStatus },
  ) {
    const index = this.memberships.findIndex((item) => item.id === membershipId);
    const current = this.memberships[index];
    if (!current) throw new Error("Membership fixture was not found");

    const updated = { ...current, ...changes, updatedAt: now };
    this.memberships[index] = updated;
    return updated;
  }

  async countActiveAdmins(
    organizationId: string,
    adminRole: OrganizationRole,
  ) {
    return this.memberships.filter(
      (item) =>
        item.organizationId === organizationId &&
        item.role === adminRole &&
        item.status === "active",
    ).length;
  }
}

function expectAppError(error: unknown, code: string) {
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

describe("OrganizationService", () => {
  it("creates a university and assigns the creator as its first admin", async () => {
    const repository = new FakeOrganizationRepository();
    const service = new OrganizationService(repository);

    await service.createOrganization({
      actorUserId: "creator",
      type: "university",
      name: "Trainy University",
      slug: "trainy-university",
    });

    expect(repository.memberships[0]).toMatchObject({
      userId: "creator",
      role: "university_admin",
      status: "active",
    });
  });

  it("rejects a duplicate organization slug", async () => {
    const repository = new FakeOrganizationRepository();
    repository.organizations.push(makeOrganization());
    const service = new OrganizationService(repository);

    try {
      await service.createOrganization({
        actorUserId: "creator",
        type: "university",
        name: "Duplicate",
        slug: "trainy-university",
      });
      throw new Error("Expected createOrganization to reject");
    } catch (error) {
      expectAppError(error, "ORGANIZATION_SLUG_CONFLICT");
    }
  });

  it("does not reveal an organization to a user outside that tenant", async () => {
    const repository = new FakeOrganizationRepository();
    repository.organizations.push(makeOrganization());
    const service = new OrganizationService(repository);

    try {
      await service.getOrganization("outsider", makeOrganization().id);
      throw new Error("Expected getOrganization to reject");
    } catch (error) {
      expectAppError(error, "ORGANIZATION_NOT_FOUND");
    }
  });

  it("rejects a company role in a university", async () => {
    const repository = new FakeOrganizationRepository();
    repository.organizations.push(makeOrganization());
    repository.memberships.push(makeMembership());
    const service = new OrganizationService(repository);

    try {
      await service.addMembership({
        actorUserId: "admin-user",
        organizationId: makeOrganization().id,
        userId: "new-user",
        role: "supervisor",
      });
      throw new Error("Expected addMembership to reject");
    } catch (error) {
      expectAppError(error, "INVALID_ORGANIZATION_ROLE");
    }
  });

  it("requires an active organization admin to add a member", async () => {
    const repository = new FakeOrganizationRepository();
    repository.organizations.push(makeOrganization());
    repository.memberships.push(
      makeMembership({ userId: "advisor", role: "advisor" }),
    );
    const service = new OrganizationService(repository);

    try {
      await service.addMembership({
        actorUserId: "advisor",
        organizationId: makeOrganization().id,
        userId: "new-user",
        role: "student",
      });
      throw new Error("Expected addMembership to reject");
    } catch (error) {
      expectAppError(error, "ORGANIZATION_ADMIN_REQUIRED");
    }
  });

  it("rejects a membership for an unknown user", async () => {
    const repository = new FakeOrganizationRepository();
    repository.organizations.push(makeOrganization());
    repository.memberships.push(makeMembership());
    const service = new OrganizationService(repository);

    try {
      await service.addMembership({
        actorUserId: "admin-user",
        organizationId: makeOrganization().id,
        userId: "missing-user",
        role: "student",
      });
      throw new Error("Expected addMembership to reject");
    } catch (error) {
      expectAppError(error, "USER_NOT_FOUND");
    }
  });

  it("prevents suspending the last active organization admin", async () => {
    const repository = new FakeOrganizationRepository();
    const organization = makeOrganization();
    const admin = makeMembership();
    repository.organizations.push(organization);
    repository.memberships.push(admin);
    const service = new OrganizationService(repository);

    try {
      await service.updateMembership({
        actorUserId: admin.userId,
        organizationId: organization.id,
        membershipId: admin.id,
        status: "suspended",
      });
      throw new Error("Expected updateMembership to reject");
    } catch (error) {
      expectAppError(error, "LAST_ADMIN_REQUIRED");
    }
  });
});
