import { AppError } from "../../lib/app-error";
import type { InviteRecord, InviteRepository } from "./invite.repository";
import type { InviteRole } from "./invite.schema";

const inviterRoles = ["university_admin", "coordinator"] as const;

function notFound() {
  return new AppError("Invite was not found", 404, "INVITE_NOT_FOUND");
}

export class InviteService {
  constructor(private readonly repository: InviteRepository) {}

  async createInvite(input: {
    actorUserId: string;
    organizationId: string;
    role: InviteRole;
    targetOrganizationId?: string;
    proposedOrganizationName?: string;
  }): Promise<InviteRecord> {
    await this.requireMembership(input.actorUserId, input.organizationId, inviterRoles);
    if (input.targetOrganizationId) {
      const target = await this.repository.findOrganization(input.targetOrganizationId);
      if (!target || target.status !== "active" || target.type !== "company")
        throw new AppError("The selected company is unavailable", 404, "COMPANY_NOT_FOUND");
    }
    return this.repository.create({
      inviterUserId: input.actorUserId,
      inviterOrganizationId: input.organizationId,
      role: input.role,
      targetOrganizationId: input.targetOrganizationId,
      proposedOrganizationName: input.proposedOrganizationName,
    });
  }

  async listInvites(actorUserId: string, organizationId: string): Promise<InviteRecord[]> {
    await this.requireMembership(actorUserId, organizationId, inviterRoles);
    return this.repository.listForOrganization(organizationId);
  }

  async revokeInvite(actorUserId: string, inviteId: string): Promise<InviteRecord> {
    const invite = await this.repository.findById(inviteId);
    if (!invite) throw notFound();
    await this.requireMembership(actorUserId, invite.inviterOrganizationId, inviterRoles);
    try {
      return await this.repository.revoke(inviteId);
    } catch {
      throw new AppError("Invite is no longer available to revoke", 409, "INVITE_NOT_REVOCABLE");
    }
  }

  async redeemInvite(redeemerUserId: string, token: string): Promise<InviteRecord> {
    const invite = await this.repository.findByToken(token);
    if (!invite) throw notFound();
    if (invite.revokedAt || invite.redeemedAt || invite.expiresAt <= new Date())
      throw new AppError("Invite is no longer valid", 409, "INVITE_NOT_REDEEMABLE");
    if (invite.targetOrganizationId) {
      const existing = await this.repository.findMembership(
        invite.targetOrganizationId,
        redeemerUserId,
      );
      if (existing)
        throw new AppError("An active membership already exists", 409, "MEMBERSHIP_CONFLICT");
    }
    try {
      return await this.repository.redeem({ invite, redeemerUserId });
    } catch {
      throw new AppError("Invite is no longer valid", 409, "INVITE_NOT_REDEEMABLE");
    }
  }

  private async requireMembership(
    userId: string,
    organizationId: string,
    roles: readonly string[],
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
}
