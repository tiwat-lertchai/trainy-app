export type WorkspaceEntry = {
	organization: { id: string };
	membership: { status: "active" | "suspended" };
};

export function resolveWorkspaceId(entries: readonly WorkspaceEntry[], storedId: string | null) {
	const activeEntries = entries.filter((entry) => entry.membership.status === "active");
	if (storedId && activeEntries.some((entry) => entry.organization.id === storedId))
		return storedId;
	return activeEntries[0]?.organization.id ?? null;
}
