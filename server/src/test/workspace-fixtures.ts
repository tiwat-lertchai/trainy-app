import { eq } from "drizzle-orm";
import type { Database } from "../db";
import { organization, organizationMembership } from "../db/schema";
import type { OrganizationRole } from "../modules/organizations/organization.schema";
import {
  provisionMembershipCore,
  seedWorkspaceCore,
} from "../modules/workspace-access/workspace-core.provisioning";

export async function insertMembershipsWithAccess(
  database: Database,
  entries: Array<{ organizationId: string; userId: string; role: OrganizationRole }>,
) {
  const seededOrganizations = new Set<string>();

  for (const entry of entries) {
    if (!seededOrganizations.has(entry.organizationId)) {
      const workspace = await database.query.organization.findFirst({
        columns: { id: true, type: true },
        where: eq(organization.id, entry.organizationId),
      });
      if (!workspace) throw new Error("Workspace fixture was not found");
      await seedWorkspaceCore(database, {
        organizationId: workspace.id,
        organizationType: workspace.type,
      });
      seededOrganizations.add(entry.organizationId);
    }

    const [membership] = await database
      .insert(organizationMembership)
      .values({ organizationId: entry.organizationId, userId: entry.userId })
      .returning();
    if (!membership) throw new Error("Membership fixture was not created");
    await provisionMembershipCore(database, {
      organizationId: entry.organizationId,
      membershipId: membership.id,
      userId: entry.userId,
      role: entry.role,
    });
  }
}
