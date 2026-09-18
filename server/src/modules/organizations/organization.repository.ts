import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
  accessRole,
  membershipRoleAssignment,
  organization,
  organizationMembership,
  user,
} from "../../db/schema";
import {
  provisionMembershipCore,
  seedWorkspaceCore,
} from "../workspace-access/workspace-core.provisioning";
import { activePrimaryRoleAssignment } from "../workspace-access/workspace-access.repository";
import type { MembershipStatus, OrganizationRole, OrganizationType } from "./organization.schema";

export type OrganizationRecord = typeof organization.$inferSelect;
export type MembershipRecord = typeof organizationMembership.$inferSelect & {
  role: OrganizationRole;
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
    return this.database.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(organization)
        .values({ type: input.type, name: input.name, slug: input.slug })
        .returning();
      if (!workspace) throw new Error("Database did not return the created organization");
      await seedWorkspaceCore(tx, {
        organizationId: workspace.id,
        organizationType: workspace.type,
      });
      const [membership] = await tx
        .insert(organizationMembership)
        .values({ organizationId: workspace.id, userId: input.ownerUserId })
        .returning();
      if (!membership) throw new Error("Database did not return the owner membership");
      await provisionMembershipCore(tx, {
        organizationId: workspace.id,
        membershipId: membership.id,
        userId: input.ownerUserId,
        role: input.ownerRole,
      });
      return workspace;
    });
  }

  async findBySlug(slug: string) {
    return this.database.query.organization.findFirst({ where: eq(organization.slug, slug) });
  }

  async userExists(userId: string) {
    return (
      (await this.database.query.user.findFirst({
        columns: { id: true },
        where: eq(user.id, userId),
      })) !== undefined
    );
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

  async listForUser(userId: string): Promise<OrganizationMembershipRecord[]> {
    const rows = await this.database
      .select({ organization, membership: organizationMembership, role: accessRole.key })
      .from(organization)
      .innerJoin(organizationMembership, eq(organizationMembership.organizationId, organization.id))
      .innerJoin(membershipRoleAssignment, activePrimaryRoleAssignment())
      .innerJoin(accessRole, eq(accessRole.id, membershipRoleAssignment.roleId))
      .where(
        and(eq(organizationMembership.userId, userId), eq(organizationMembership.status, "active")),
      );
    return rows.map(({ organization: workspace, membership, role }) => ({
      organization: workspace,
      membership: { ...membership, role: role as OrganizationRole },
    }));
  }

  async findMembership(organizationId: string, userId: string) {
    const [record] = await this.membershipQuery().where(
      and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
      ),
    );
    return record ? this.mapMembership(record) : undefined;
  }

  async findMembershipById(organizationId: string, membershipId: string) {
    const [record] = await this.membershipQuery().where(
      and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.id, membershipId),
      ),
    );
    return record ? this.mapMembership(record) : undefined;
  }

  async listMemberships(organizationId: string) {
    const rows = await this.membershipQuery(true).where(
      eq(organizationMembership.organizationId, organizationId),
    );
    return rows.map((record) => this.mapMembership(record));
  }

  async addMembership(input: { organizationId: string; userId: string; role: OrganizationRole }) {
    return this.database.transaction(async (tx) => {
      const [membership] = await tx
        .insert(organizationMembership)
        .values({ organizationId: input.organizationId, userId: input.userId })
        .returning();
      if (!membership) throw new Error("Database did not return the created membership");
      await provisionMembershipCore(tx, { ...input, membershipId: membership.id });
      return { ...membership, role: input.role };
    });
  }

  async updateMembership(
    membershipId: string,
    changes: { role?: OrganizationRole; status?: MembershipStatus },
  ) {
    return this.database.transaction(async (tx) => {
      const [current] = await tx
        .select({ organizationId: organizationMembership.organizationId })
        .from(organizationMembership)
        .where(eq(organizationMembership.id, membershipId))
        .limit(1);
      if (!current) throw new Error("Membership was not found");
      if (changes.status)
        await tx
          .update(organizationMembership)
          .set({ status: changes.status })
          .where(eq(organizationMembership.id, membershipId));
      if (changes.role) {
        const [role] = await tx
          .select({ id: accessRole.id })
          .from(accessRole)
          .where(
            and(
              eq(accessRole.organizationId, current.organizationId),
              eq(accessRole.key, changes.role),
            ),
          )
          .limit(1);
        if (!role) throw new Error("Workspace role was not found");
        await tx
          .update(membershipRoleAssignment)
          .set({ roleId: role.id })
          .where(
            and(
              eq(membershipRoleAssignment.membershipId, membershipId),
              eq(membershipRoleAssignment.isPrimary, true),
            ),
          );
      }
      const [record] = await tx
        .select({ membership: organizationMembership, role: accessRole.key })
        .from(organizationMembership)
        .innerJoin(membershipRoleAssignment, activePrimaryRoleAssignment())
        .innerJoin(accessRole, eq(accessRole.id, membershipRoleAssignment.roleId))
        .where(eq(organizationMembership.id, membershipId))
        .limit(1);
      if (!record) throw new Error("Database did not return the updated membership");
      return { ...record.membership, role: record.role as OrganizationRole };
    });
  }

  async countActiveAdmins(organizationId: string, adminRole: OrganizationRole) {
    const [result] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembership)
      .innerJoin(membershipRoleAssignment, activePrimaryRoleAssignment())
      .innerJoin(accessRole, eq(accessRole.id, membershipRoleAssignment.roleId))
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(accessRole.key, adminRole),
          eq(organizationMembership.status, "active"),
        ),
      );
    return result?.count ?? 0;
  }

  private membershipQuery(includeUser = false) {
    return this.database
      .select({
        membership: organizationMembership,
        role: accessRole.key,
        user: includeUser ? { id: user.id, name: user.name, email: user.email } : sql<null>`null`,
      })
      .from(organizationMembership)
      .innerJoin(membershipRoleAssignment, activePrimaryRoleAssignment())
      .innerJoin(accessRole, eq(accessRole.id, membershipRoleAssignment.roleId))
      .leftJoin(user, eq(user.id, organizationMembership.userId));
  }

  private mapMembership(record: {
    membership: typeof organizationMembership.$inferSelect;
    role: string;
    user: { id: string; name: string; email: string } | null;
  }): MembershipRecord {
    return {
      ...record.membership,
      role: record.role as OrganizationRole,
      ...(record.user ? { user: record.user } : {}),
    };
  }
}
