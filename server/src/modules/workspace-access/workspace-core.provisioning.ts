import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import {
  accessPermission,
  accessRole,
  accessRolePermission,
  membershipMemberType,
  membershipRoleAssignment,
  organizationMemberType,
  user,
  workspaceProfile,
} from "../../db/schema";
import type { OrganizationRole, OrganizationType } from "../organizations/organization.schema";

type DatabaseExecutor = Pick<Database, "insert" | "select">;

const rolesByOrganizationType: Record<OrganizationType, readonly OrganizationRole[]> = {
  university: ["university_admin", "coordinator", "advisor", "student"],
  company: ["company_admin", "supervisor"],
};

const memberTypesByOrganizationType = {
  university: ["student", "teacher", "staff", "other"],
  company: ["employee", "workplace_supervisor", "other"],
} as const satisfies Record<OrganizationType, readonly string[]>;

const memberTypeByRole: Record<OrganizationRole, string> = {
  university_admin: "staff",
  coordinator: "staff",
  advisor: "teacher",
  student: "student",
  company_admin: "employee",
  supervisor: "workplace_supervisor",
};

const baselinePermissions = [
  "workspace.read",
  "profile.workspace.read.self",
  "profile.workspace.update.self",
] as const;

const permissionsByRole: Partial<Record<OrganizationRole, readonly string[]>> = {
  university_admin: [
    "workspace.settings.update",
    "membership.read",
    "membership.invite",
    "membership.review",
    "membership.role.assign",
    "audit.read",
  ],
  company_admin: [
    "workspace.settings.update",
    "membership.read",
    "membership.invite",
    "membership.review",
    "membership.role.assign",
    "audit.read",
  ],
  coordinator: ["membership.read", "membership.invite", "membership.review"],
};

export async function seedWorkspaceCore(
  database: DatabaseExecutor,
  input: { organizationId: string; organizationType: OrganizationType },
) {
  await database
    .insert(organizationMemberType)
    .values(
      memberTypesByOrganizationType[input.organizationType].map((key) => ({
        organizationId: input.organizationId,
        key,
        label: key
          .split("_")
          .map((part) => part[0]?.toUpperCase() + part.slice(1))
          .join(" "),
        isManaged: true,
      })),
    )
    .onConflictDoNothing();

  await database
    .insert(accessRole)
    .values(
      rolesByOrganizationType[input.organizationType].map((key) => ({
        organizationId: input.organizationId,
        key,
        name: key
          .split("_")
          .map((part) => part[0]?.toUpperCase() + part.slice(1))
          .join(" "),
        kind: "system" as const,
        isManaged: true,
      })),
    )
    .onConflictDoNothing();

  const roles = await database
    .select({ id: accessRole.id, key: accessRole.key })
    .from(accessRole)
    .where(eq(accessRole.organizationId, input.organizationId));

  for (const role of roles) {
    const permissionKeys = [
      ...baselinePermissions,
      ...(permissionsByRole[role.key as OrganizationRole] ?? []),
    ];

    if (!permissionKeys.length) continue;

    const permissions = await database
      .select({ key: accessPermission.key })
      .from(accessPermission)
      // Querying prevents an FK failure while migrations are being rolled out.
      .where(inArray(accessPermission.key, permissionKeys));

    if (permissions.length) {
      await database
        .insert(accessRolePermission)
        .values(permissions.map(({ key }) => ({ roleId: role.id, permissionKey: key })))
        .onConflictDoNothing();
    }
  }
}

export async function provisionMembershipCore(
  database: DatabaseExecutor,
  input: {
    organizationId: string;
    membershipId: string;
    userId: string;
    role: OrganizationRole;
  },
) {
  const [role] = await database
    .select({ id: accessRole.id })
    .from(accessRole)
    .where(and(eq(accessRole.organizationId, input.organizationId), eq(accessRole.key, input.role)))
    .limit(1);
  const [memberType] = await database
    .select({ id: organizationMemberType.id })
    .from(organizationMemberType)
    .where(
      and(
        eq(organizationMemberType.organizationId, input.organizationId),
        eq(organizationMemberType.key, memberTypeByRole[input.role]),
      ),
    )
    .limit(1);
  const [accountUser] = await database
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);

  if (!role || !memberType || !accountUser) {
    throw new Error("Workspace Core templates or user were not found");
  }

  await database.insert(membershipRoleAssignment).values({
    organizationId: input.organizationId,
    membershipId: input.membershipId,
    roleId: role.id,
    isPrimary: true,
    scopeType: "workspace",
  });
  await database.insert(membershipMemberType).values({
    organizationId: input.organizationId,
    membershipId: input.membershipId,
    memberTypeId: memberType.id,
    isPrimary: true,
    source: "administrator",
  });
  await database.insert(workspaceProfile).values({
    organizationId: input.organizationId,
    membershipId: input.membershipId,
    displayName: accountUser.name,
    institutionalEmail: accountUser.email,
    source: "membership_creation",
  });
}
