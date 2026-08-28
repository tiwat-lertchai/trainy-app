import type { OrganizationRole } from "@/features/organizations/role-navigation";

export type StatusCount = { status: string; count: number };

export type DashboardSnapshot = {
	primaryValue: number;
	primaryLabel: "placements" | "applications" | "members";
	actionItems: number;
	completedItems: number;
	secondaryValue: number;
	secondaryLabel: "internships" | "organizations" | "members";
};

export function dashboardFromReport(report: {
	activeMembers: number;
	internships?: number;
	applications: StatusCount[];
	placements: StatusCount[];
}): DashboardSnapshot {
	return {
		primaryValue: total(report.placements),
		primaryLabel: "placements",
		actionItems:
			count(report.applications, ["submitted", "under_review"]) +
			count(report.placements, ["pending"]),
		completedItems: count(report.placements, ["completed"]),
		secondaryValue: report.internships ?? report.activeMembers,
		secondaryLabel: report.internships === undefined ? "members" : "internships",
	};
}

export function dashboardFromWorkflow(input: {
	role: OrganizationRole;
	placements: Array<{ status: string }>;
	applications?: Array<{ status: string }>;
	organizationCount: number;
}): DashboardSnapshot {
	const pendingApplications =
		input.applications?.filter((item) => ["submitted", "under_review"].includes(item.status))
			.length ?? 0;
	return {
		primaryValue:
			input.role === "student" ? (input.applications?.length ?? 0) : input.placements.length,
		primaryLabel: input.role === "student" ? "applications" : "placements",
		actionItems:
			input.placements.filter((item) => item.status === "pending").length + pendingApplications,
		completedItems: input.placements.filter((item) => item.status === "completed").length,
		secondaryValue: input.organizationCount,
		secondaryLabel: "organizations",
	};
}

function count(items: StatusCount[], statuses: string[]) {
	return items
		.filter((item) => statuses.includes(item.status))
		.reduce((sum, item) => sum + item.count, 0);
}

function total(items: StatusCount[]) {
	return items.reduce((sum, item) => sum + item.count, 0);
}
