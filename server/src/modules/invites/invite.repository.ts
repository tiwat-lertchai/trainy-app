import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "../../db";
import { organization, organizationInvite, organizationMembership } from "../../db/schema";
import type { InviteRole } from "./invite.schema";

export type InviteRecord = typeof organizationInvite.$inferSelect;
type MembershipRecord = typeof organizationMembership.$inferSelect;

function generateToken() {
  return randomBytes(32).toString("base64url");
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "company"}-${randomBytes(3).toString("hex")}`;
}

export interface InviteRepository {
  findMembership(organizationId: string, userId: string): Promise<MembershipRecord | undefined>;
  findOrganization(id: string): Promise<typeof organization.$inferSelect | undefined>;
  findById(id: string): Promise<InviteRecord | undefined>;
  findByToken(token: string): Promise<InviteRecord | undefined>;
  listForOrganization(organizationId: string): Promise<InviteRecord[]>;
  create(input: {
    inviterUserId: string;
    inviterOrganizationId: string;
    role: InviteRole;
    targetOrganizationId?: string;
    proposedOrganizationName?: string;
  }): Promise<InviteRecord>;
  revoke(id: string): Promise<InviteRecord>;
  redeem(input: { invite: InviteRecord; redeemerUserId: string }): Promise<InviteRecord>;
}

const INVITE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

export class DrizzleInviteRepository implements InviteRepository {
  constructor(private readonly database: Database) {}

  findMembership(organizationId: string, userId: string) {
    return this.database.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
      ),
    });
  }

  findOrganization(id: string) {
    return this.database.query.organization.findFirst({ where: eq(organization.id, id) });
  }

  findById(id: string) {
    return this.database.query.organizationInvite.findFirst({
      where: eq(organizationInvite.id, id),
    });
  }

  findByToken(token: string) {
    return this.database.query.organizationInvite.findFirst({
      where: eq(organizationInvite.token, token),
    });
  }

  listForOrganization(organizationId: string) {
    return this.database.query.organizationInvite.findMany({
      where: eq(organizationInvite.inviterOrganizationId, organizationId),
      orderBy: (invite, { desc }) => [desc(invite.createdAt)],
      limit: 100,
    });
  }

  async create(input: {
    inviterUserId: string;
    inviterOrganizationId: string;
    role: InviteRole;
    targetOrganizationId?: string;
    proposedOrganizationName?: string;
  }) {
    const [record] = await this.database
      .insert(organizationInvite)
      .values({
        ...input,
        token: generateToken(),
        expiresAt: new Date(Date.now() + INVITE_LIFETIME_MS),
      })
      .returning();
    if (!record) throw new Error("Database did not return the invite");
    return record;
  }

  async revoke(id: string) {
    const [record] = await this.database
      .update(organizationInvite)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(organizationInvite.id, id),
          isNull(organizationInvite.revokedAt),
          isNull(organizationInvite.redeemedAt),
        ),
      )
      .returning();
    if (!record) throw new Error("Invite is no longer available to revoke");
    return record;
  }

  redeem(input: { invite: InviteRecord; redeemerUserId: string }) {
    return this.database.transaction(async (transaction) => {
      let organizationId = input.invite.targetOrganizationId;
      if (!organizationId) {
        if (!input.invite.proposedOrganizationName)
          throw new Error("Invite is missing both a target and a proposed organization");
        const [created] = await transaction
          .insert(organization)
          .values({
            type: "company",
            name: input.invite.proposedOrganizationName,
            slug: slugify(input.invite.proposedOrganizationName),
          })
          .returning();
        if (!created) throw new Error("Database did not return the company");
        organizationId = created.id;
      }
      await transaction.insert(organizationMembership).values({
        organizationId,
        userId: input.redeemerUserId,
        role: input.invite.role,
      });
      const [updated] = await transaction
        .update(organizationInvite)
        .set({
          targetOrganizationId: organizationId,
          redeemedAt: new Date(),
          redeemedByUserId: input.redeemerUserId,
        })
        .where(
          and(
            eq(organizationInvite.id, input.invite.id),
            isNull(organizationInvite.redeemedAt),
            isNull(organizationInvite.revokedAt),
            gt(organizationInvite.expiresAt, new Date()),
          ),
        )
        .returning();
      if (!updated) throw new Error("Invite is no longer available to redeem");
      return updated;
    });
  }
}
