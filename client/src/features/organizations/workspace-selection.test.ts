import { describe, expect, it } from "bun:test";
import { resolveWorkspaceId, type WorkspaceEntry } from "./workspace-selection";

const entry = (id: string, status: "active" | "suspended" = "active"): WorkspaceEntry => ({
	organization: { id },
	membership: { status },
});

describe("workspace selection", () => {
	it("restores a valid active organization", () =>
		expect(resolveWorkspaceId([entry("a"), entry("b")], "b")).toBe("b"));
	it("falls back when a stored tenant is inaccessible", () =>
		expect(resolveWorkspaceId([entry("a")], "outsider")).toBe("a"));
	it("never selects a suspended membership", () =>
		expect(resolveWorkspaceId([entry("a", "suspended")], "a")).toBeNull());
});
