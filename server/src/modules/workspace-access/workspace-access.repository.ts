import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { Database } from "../../db";
import {
  accessRolePermission,
  accessRole,
  membershipRoleAssignment,
  organizationMembership,
} from "../../db/schema";

export function activePrimaryRoleAssignment() {
  return and(
    eq(membershipRoleAssignment.membershipId, organizationMembership.id),
    eq(membershipRoleAssignment.organizationId, organizationMembership.organizationId),
    eq(membershipRoleAssignment.isPrimary, true),
    or(
      isNull(membershipRoleAssignment.expiresAt),
      gt(membershipRoleAssignment.expiresAt, new Date()),
    ),
  );
}

export async function findMembershipAccess(
  database: Database,
  organizationId: string,
  userId: string,
) {
  const [record] = await database
    .select({
      id: organizationMembership.id,
      organizationId: organizationMembership.organizationId,
      userId: organizationMembership.userId,
      status: organizationMembership.status,
      createdAt: organizationMembership.createdAt,
      updatedAt: organizationMembership.updatedAt,
      role: accessRole.key,
    })
    .from(organizationMembership)
    .innerJoin(membershipRoleAssignment, activePrimaryRoleAssignment())
    .innerJoin(
      accessRole,
      and(
        eq(accessRole.id, membershipRoleAssignment.roleId),
        eq(accessRole.organizationId, organizationMembership.organizationId),
      ),
    )
    .where(
      and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
      ),
    )
    .limit(1);

  return record;
}

export type PermissionGrant = {
  membershipId: string;
  permission: string;
  scopeType: "self" | "assigned" | "organization_unit" | "workspace";
  scopeRefId: string | null;
};

export interface WorkspaceAccessRepository {
  findActiveMembership(
    organizationId: string,
    userId: string,
  ): Promise<{ id: string; organizationId: string; userId: string } | undefined>;
  listPermissionGrants(input: {
    organizationId: string;
    membershipId: string;
    at: Date;
  }): Promise<PermissionGrant[]>;
}

export class DrizzleWorkspaceAccessRepository implements WorkspaceAccessRepository {
  constructor(private readonly database: Database) {}

  async findActiveMembership(organizationId: string, userId: string) {
    return this.database.query.organizationMembership.findFirst({
      columns: { id: true, organizationId: true, userId: true },
      where: and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
        eq(organizationMembership.status, "active"),
      ),
    });
  }

  async listPermissionGrants(input: { organizationId: string; membershipId: string; at: Date }) {
    return this.database
      .select({
        membershipId: membershipRoleAssignment.membershipId,
        permission: accessRolePermission.permissionKey,
        scopeType: membershipRoleAssignment.scopeType,
        scopeRefId: membershipRoleAssignment.scopeRefId,
      })
      .from(membershipRoleAssignment)
      .innerJoin(
        accessRolePermission,
        eq(accessRolePermission.roleId, membershipRoleAssignment.roleId),
      )
      .where(
        and(
          eq(membershipRoleAssignment.organizationId, input.organizationId),
          eq(membershipRoleAssignment.membershipId, input.membershipId),
          or(
            isNull(membershipRoleAssignment.expiresAt),
            gt(membershipRoleAssignment.expiresAt, input.at),
          ),
        ),
      );
  }
}
