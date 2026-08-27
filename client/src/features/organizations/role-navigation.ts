export type OrganizationRole =
	| "university_admin"
	| "coordinator"
	| "advisor"
	| "student"
	| "company_admin"
	| "supervisor";

export type NavigationKey =
	| "overview"
	| "internships"
	| "applications"
	| "placements"
	| "progress"
	| "documents"
	| "evaluations"
	| "members"
	| "reports";

const roleNavigation: Record<OrganizationRole, readonly NavigationKey[]> = {
	university_admin: ["overview", "applications", "placements", "members", "reports"],
	coordinator: ["overview", "applications", "placements", "reports"],
	advisor: ["overview", "placements", "progress", "documents", "evaluations"],
	student: ["overview", "internships", "applications", "placements", "progress", "documents", "evaluations"],
	company_admin: ["overview", "internships", "applications", "placements", "members", "reports"],
	supervisor: ["overview", "internships", "applications", "placements", "progress", "documents", "evaluations"],
};

export function getNavigationForRole(role: OrganizationRole) {
	return roleNavigation[role];
}
