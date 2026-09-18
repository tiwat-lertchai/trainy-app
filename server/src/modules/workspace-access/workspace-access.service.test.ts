import { describe, expect, it } from "bun:test";
import { AppError } from "../../lib/app-error";
import type { PermissionGrant, WorkspaceAccessRepository } from "./workspace-access.repository";
import { WorkspaceAccessService } from "./workspace-access.service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";
const userId = "workspace-user";

class FakeWorkspaceAccessRepository implements WorkspaceAccessRepository {
  membership: { id: string; organizationId: string; userId: string } | undefined;
  grants: PermissionGrant[] = [];
  lastGrantLookup: { organizationId: string; membershipId: string; at: Date } | undefined;

  async findActiveMembership(requestedOrganizationId: string, requestedUserId: string) {
    if (
      this.membership?.organizationId !== requestedOrganizationId ||
      this.membership.userId !== requestedUserId
    ) {
      return undefined;
    }

    return this.membership;
  }

  async listPermissionGrants(input: { organizationId: string; membershipId: string; at: Date }) {
    this.lastGrantLookup = input;
    return this.grants;
  }
}

function expectAppError(error: unknown, code: string) {
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

describe("WorkspaceAccessService", () => {
  it("denies an outsider without revealing whether the workspace exists", async () => {
    const service = new WorkspaceAccessService(new FakeWorkspaceAccessRepository());

    try {
      await service.resolveContext(userId, organizationId);
      throw new Error("Expected workspace resolution to reject");
    } catch (error) {
      expectAppError(error, "WORKSPACE_NOT_FOUND");
    }
  });

  it("resolves only permissions granted through active role assignments", async () => {
    const repository = new FakeWorkspaceAccessRepository();
    repository.membership = { id: membershipId, organizationId, userId };
    repository.grants = [
      {
        membershipId,
        permission: "membership.read",
        scopeType: "workspace",
        scopeRefId: null,
      },
    ];
    const now = new Date("2026-09-18T00:00:00.000Z");
    const service = new WorkspaceAccessService(repository, () => now);

    const context = await service.resolveContext(userId, organizationId);

    expect(service.requirePermission(context, "membership.read")).toHaveLength(1);
    expect(repository.lastGrantLookup).toEqual({ organizationId, membershipId, at: now });
  });

  it("does not treat member type or membership alone as a permission", async () => {
    const repository = new FakeWorkspaceAccessRepository();
    repository.membership = { id: membershipId, organizationId, userId };
    const service = new WorkspaceAccessService(repository);
    const context = await service.resolveContext(userId, organizationId);

    try {
      service.requirePermission(context, "membership.read");
      throw new Error("Expected permission enforcement to reject");
    } catch (error) {
      expectAppError(error, "WORKSPACE_PERMISSION_REQUIRED");
    }
  });
});
