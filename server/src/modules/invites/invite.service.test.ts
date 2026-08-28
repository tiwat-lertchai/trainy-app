import { describe, expect, it } from "bun:test";
import { AppError } from "../../lib/app-error";
import type { InviteRecord, InviteRepository } from "./invite.repository";
import { InviteService } from "./invite.service";

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

function invite(values: Partial<InviteRecord> = {}): InviteRecord {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    token: "token-abc",
    inviterUserId: "admin",
    inviterOrganizationId: university.id,
    role: "supervisor",
    targetOrganizationId: company.id,
    proposedOrganizationName: null,
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14),
    redeemedAt: null,
    redeemedByUserId: null,
    revokedAt: null,
    createdAt: now,
    ...values,
  };
}

type Membership = {
  id: string;
  organizationId: string;
  userId: string;
  role:
    | "university_admin"
    | "coordinator"
    | "advisor"
    | "student"
    | "company_admin"
    | "supervisor";
  status: "active";
  createdAt: Date;
  updatedAt: Date;
};

function membership(values: Omit<Membership, "id" | "createdAt" | "updatedAt">): Membership {
  return { id: `${values.organizationId}:${values.userId}`, createdAt: now, updatedAt: now, ...values };
}

class FakeRepository implements InviteRepository {
  invites: InviteRecord[] = [];
  organizations = [university, company];
  memberships = new Map<string, Membership>();

  async findMembership(organizationId: string, userId: string) {
    return this.memberships.get(`${organizationId}:${userId}`);
  }
  async findOrganization(id: string) {
    return this.organizations.find((item) => item.id === id);
  }
  async findById(id: string) {
    return this.invites.find((item) => item.id === id);
  }
  async findByToken(token: string) {
    return this.invites.find((item) => item.token === token);
  }
  async listForOrganization(organizationId: string) {
    return this.invites.filter((item) => item.inviterOrganizationId === organizationId);
  }
  async create(input: Parameters<InviteRepository["create"]>[0]) {
    const record = invite({
      inviterUserId: input.inviterUserId,
      inviterOrganizationId: input.inviterOrganizationId,
      role: input.role,
      targetOrganizationId: input.targetOrganizationId ?? null,
      proposedOrganizationName: input.proposedOrganizationName ?? null,
    });
    this.invites.push(record);
    return record;
  }
  async revoke(id: string) {
    const record = this.invites.find((item) => item.id === id);
    if (!record || record.revokedAt || record.redeemedAt)
      throw new Error("Invite is no longer available to revoke");
    record.revokedAt = now;
    return record;
  }
  async redeem(input: { invite: InviteRecord; redeemerUserId: string }) {
    const record = this.invites.find((item) => item.id === input.invite.id);
    if (!record || record.revokedAt || record.redeemedAt || record.expiresAt <= now)
      throw new Error("Invite is no longer available to redeem");
    let organizationId = record.targetOrganizationId;
    if (!organizationId) {
      organizationId = "44444444-4444-4444-8444-444444444444";
      this.organizations.push({ ...company, id: organizationId, name: "New Co" });
    }
    record.targetOrganizationId = organizationId;
    record.redeemedAt = now;
    record.redeemedByUserId = input.redeemerUserId;
    this.memberships.set(
      `${organizationId}:${input.redeemerUserId}`,
      membership({ organizationId, userId: input.redeemerUserId, role: record.role, status: "active" }),
    );
    return record;
  }
}

function service(setup?: (repository: FakeRepository) => void) {
  const repository = new FakeRepository();
  repository.memberships.set(
    `${university.id}:admin`,
    membership({ organizationId: university.id, userId: "admin", role: "university_admin", status: "active" }),
  );
  setup?.(repository);
  return { repository, service: new InviteService(repository) };
}

describe("InviteService", () => {
  it("lets a university_admin create an invite for an existing company", async () => {
    const { service: svc } = service();
    const record = await svc.createInvite({
      actorUserId: "admin",
      organizationId: university.id,
      role: "supervisor",
      targetOrganizationId: company.id,
    });
    expect(record.targetOrganizationId).toBe(company.id);
    expect(record.token).toBeTruthy();
  });

  it("rejects an invite created by someone without university access", async () => {
    const { service: svc } = service();
    await expect(
      svc.createInvite({
        actorUserId: "stranger",
        organizationId: university.id,
        role: "supervisor",
        targetOrganizationId: company.id,
      }),
    ).rejects.toThrow(AppError);
  });

  it("rejects a target organization that is not an active company", async () => {
    const { service: svc } = service();
    await expect(
      svc.createInvite({
        actorUserId: "admin",
        organizationId: university.id,
        role: "supervisor",
        targetOrganizationId: university.id,
      }),
    ).rejects.toThrow(AppError);
  });

  it("redeems an invite and grants the invited role", async () => {
    const { repository, service: svc } = service();
    const created = await svc.createInvite({
      actorUserId: "admin",
      organizationId: university.id,
      role: "supervisor",
      targetOrganizationId: company.id,
    });
    const redeemed = await svc.redeemInvite("new-mentor", created.token);
    expect(redeemed.redeemedByUserId).toBe("new-mentor");
    expect(repository.memberships.get(`${company.id}:new-mentor`)?.role).toBe("supervisor");
  });

  it("rejects redeeming an expired invite", async () => {
    const { repository, service: svc } = service();
    repository.invites.push(
      invite({ id: "expired", token: "expired-token", expiresAt: new Date(now.getTime() - 1000) }),
    );
    await expect(svc.redeemInvite("someone", "expired-token")).rejects.toThrow(AppError);
  });

  it("rejects redeeming an already-redeemed invite", async () => {
    const { repository, service: svc } = service();
    repository.invites.push(
      invite({ id: "used", token: "used-token", redeemedAt: now, redeemedByUserId: "first" }),
    );
    await expect(svc.redeemInvite("second", "used-token")).rejects.toThrow(AppError);
  });

  it("rejects redeeming a revoked invite", async () => {
    const { repository, service: svc } = service();
    repository.invites.push(invite({ id: "revoked", token: "revoked-token", revokedAt: now }));
    await expect(svc.redeemInvite("someone", "revoked-token")).rejects.toThrow(AppError);
  });

  it("rejects redeeming when the caller already has a membership in the target organization", async () => {
    const { repository, service: svc } = service();
    repository.invites.push(invite({ id: "conflict", token: "conflict-token" }));
    repository.memberships.set(
      `${company.id}:existing`,
      membership({ organizationId: company.id, userId: "existing", role: "supervisor", status: "active" }),
    );
    await expect(svc.redeemInvite("existing", "conflict-token")).rejects.toThrow(AppError);
  });

  it("lets the inviter revoke an unredeemed invite", async () => {
    const { service: svc } = service();
    const created = await svc.createInvite({
      actorUserId: "admin",
      organizationId: university.id,
      role: "supervisor",
      targetOrganizationId: company.id,
    });
    const revoked = await svc.revokeInvite("admin", created.id);
    expect(revoked.revokedAt).not.toBeNull();
  });
});
