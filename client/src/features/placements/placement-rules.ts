export type PlacementStatus = "pending" | "active" | "completed" | "cancelled";

export function availablePlacementActions(status: PlacementStatus, assignmentsReady: boolean, canManage: boolean) {
	if (!canManage) return [];
	if (status === "pending") return assignmentsReady ? ["active", "cancelled"] as const : ["cancelled"] as const;
	if (status === "active") return ["completed", "cancelled"] as const;
	return [];
}
