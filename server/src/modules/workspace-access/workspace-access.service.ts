import { AppError } from "../../lib/app-error";
import type { PermissionGrant, WorkspaceAccessRepository } from "./workspace-access.repository";

export type WorkspaceAccessContext = {
  organizationId: string;
  userId: string;
  membershipId: string;
  grants: ReadonlyMap<string, readonly PermissionGrant[]>;
};

export class WorkspaceAccessService {
  constructor(
    private readonly repository: WorkspaceAccessRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async resolveContext(userId: string, organizationId: string): Promise<WorkspaceAccessContext> {
    const membership = await this.repository.findActiveMembership(organizationId, userId);

    if (!membership) {
      // Use 404 so callers cannot distinguish a missing workspace from a tenant
      // they are not allowed to discover.
      throw new AppError("Workspace was not found", 404, "WORKSPACE_NOT_FOUND");
    }

    const grants = await this.repository.listPermissionGrants({
      organizationId,
      membershipId: membership.id,
      at: this.now(),
    });
    const grantsByPermission = new Map<string, PermissionGrant[]>();

    for (const grant of grants) {
      const permissionGrants = grantsByPermission.get(grant.permission) ?? [];
      permissionGrants.push(grant);
      grantsByPermission.set(grant.permission, permissionGrants);
    }

    return {
      organizationId,
      userId,
      membershipId: membership.id,
      grants: grantsByPermission,
    };
  }

  requirePermission(context: WorkspaceAccessContext, permission: string) {
    const grants = context.grants.get(permission);

    if (!grants?.length) {
      throw new AppError("Workspace permission is required", 403, "WORKSPACE_PERMISSION_REQUIRED");
    }

    return grants;
  }
}
