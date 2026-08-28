export type OrganizationRole =
	"university_admin" | "coordinator" | "advisor" | "student" | "company_admin" | "supervisor";

export type NavigationKey =
	| "overview"
	| "internships"
	| "applications"
	| "placements"
	| "attendance"
	| "academic"
	| "progress"
	| "documents"
	| "evaluations"
	| "members"
	| "reports";

const roleNavigation: Record<OrganizationRole, readonly NavigationKey[]> = {
	university_admin: [
		"overview",
		"applications",
		"placements",
		"attendance",
		"academic",
		"members",
		"reports",
	],
	coordinator: ["overview", "applications", "placements", "attendance", "reports"],
	advisor: ["overview", "placements", "attendance", "progress", "documents", "evaluations"],
	student: [
		"overview",
		"internships",
		"applications",
		"placements",
		"attendance",
		"progress",
		"documents",
		"evaluations",
	],
	company_admin: [
		"overview",
		"internships",
		"applications",
		"placements",
		"attendance",
		"members",
		"reports",
	],
	supervisor: [
		"overview",
		"internships",
		"applications",
		"placements",
		"attendance",
		"progress",
		"documents",
		"evaluations",
	],
};

export function getNavigationForRole(role: OrganizationRole) {
	return roleNavigation[role];
}
