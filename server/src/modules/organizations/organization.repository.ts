import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { organization, organizationMembership, user } from "../../db/schema";
import type { MembershipStatus, OrganizationRole, OrganizationType } from "./organization.schema";

export type OrganizationRecord = typeof organization.$inferSelect;
export type MembershipRecord = typeof organizationMembership.$inferSelect & {
  user?: { id: string; name: string; email: string };
};
export type OrganizationMembershipRecord = {
  organization: OrganizationRecord;
  membership: MembershipRecord;
};

export interface OrganizationRepository {
  createWithOwner(input: {
    type: OrganizationType;
    name: string;
    slug: string;
    ownerUserId: string;
    ownerRole: OrganizationRole;
  }): Promise<OrganizationRecord>;
  findBySlug(slug: string): Promise<OrganizationRecord | undefined>;
  userExists(userId: string): Promise<boolean>;
  findForUser(organizationId: string, userId: string): Promise<OrganizationRecord | undefined>;
  listForUser(userId: string): Promise<OrganizationMembershipRecord[]>;
  findMembership(organizationId: string, userId: string): Promise<MembershipRecord | undefined>;
  findMembershipById(
    organizationId: string,
    membershipId: string,
  ): Promise<MembershipRecord | undefined>;
  listMemberships(organizationId: string): Promise<MembershipRecord[]>;
  addMembership(input: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
  }): Promise<MembershipRecord>;
  updateMembership(
    membershipId: string,
    changes: { role?: OrganizationRole; status?: MembershipStatus },
  ): Promise<MembershipRecord>;
  countActiveAdmins(organizationId: string, adminRole: OrganizationRole): Promise<number>;
}

export class DrizzleOrganizationRepository implements OrganizationRepository {
  constructor(private readonly database: Database) {}

  async createWithOwner(input: {
    type: OrganizationType;
    name: string;
    slug: string;
    ownerUserId: string;
    ownerRole: OrganizationRole;
  }) {
    return this.database.transaction(async (transaction) => {
      const [createdOrganization] = await transaction
        .insert(organization)
        .values({ type: input.type, name: input.name, slug: input.slug })
        .returning();

      if (!createdOrganization) {
        throw new Error("Database did not return the created organization");
      }

      await transaction.insert(organizationMembership).values({
        organizationId: createdOrganization.id,
        userId: input.ownerUserId,
        role: input.ownerRole,
      });

      return createdOrganization;
    });
  }

  async findBySlug(slug: string) {
    return this.database.query.organization.findFirst({
      where: eq(organization.slug, slug),
    });
  }

  async userExists(userId: string) {
    const record = await this.database.query.user.findFirst({
      columns: { id: true },
      where: eq(user.id, userId),
    });

    return record !== undefined;
  }

  async findForUser(organizationId: string, userId: string) {
    const [record] = await this.database
      .select({ organization })
      .from(organization)
      .innerJoin(organizationMembership, eq(organizationMembership.organizationId, organization.id))
      .where(
        and(
          eq(organization.id, organizationId),
          eq(organizationMembership.userId, userId),
          eq(organizationMembership.status, "active"),
        ),
      )
      .limit(1);

    return record?.organization;
  }

  async listForUser(userId: string) {
    return this.database
      .select({ organization, membership: organizationMembership })
      .from(organization)
      .innerJoin(organizationMembership, eq(organizationMembership.organizationId, organization.id))
      .where(
        and(eq(organizationMembership.userId, userId), eq(organizationMembership.status, "active")),
      );
  }

  async findMembership(organizationId: string, userId: string) {
    return this.database.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
      ),
    });
  }

  async findMembershipById(organizationId: string, membershipId: string) {
    return this.database.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.id, membershipId),
      ),
    });
  }

  async listMemberships(organizationId: string) {
    return this.database.query.organizationMembership.findMany({
      where: eq(organizationMembership.organizationId, organizationId),
      with: { user: { columns: { id: true, name: true, email: true } } },
    });
  }

  async addMembership(input: { organizationId: string; userId: string; role: OrganizationRole }) {
    const [membership] = await this.database
      .insert(organizationMembership)
      .values(input)
      .returning();

    if (!membership) {
      throw new Error("Database did not return the created membership");
    }

    return membership;
  }

  async updateMembership(
    membershipId: string,
    changes: { role?: OrganizationRole; status?: MembershipStatus },
  ) {
    const [membership] = await this.database
      .update(organizationMembership)
      .set(changes)
      .where(eq(organizationMembership.id, membershipId))
      .returning();

    if (!membership) {
      throw new Error("Database did not return the updated membership");
    }

    return membership;
  }

  async countActiveAdmins(organizationId: string, adminRole: OrganizationRole) {
    const [result] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembership)
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.role, adminRole),
          eq(organizationMembership.status, "active"),
        ),
      );

    return result?.count ?? 0;
  }
}
