export type OrganizationRole =
	"university_admin" | "coordinator" | "advisor" | "student" | "company_admin" | "supervisor";

export type NavigationKey =
	| "overview"
	| "requests"
	| "internship"
	| "history"
	| "approvals"
	| "students"
	| "profile"
	| "internships"
	| "applications"
	| "placements"
	| "attendance"
	| "academic"
	| "progress"
	| "cwie"
	| "documents"
	| "evaluations"
	| "invites"
	| "members"
	| "reports"
	| "accessReviews";

const roleNavigation: Record<OrganizationRole, readonly NavigationKey[]> = {
	university_admin: [
		"overview",
		"accessReviews",
		"applications",
		"placements",
		"attendance",
		"academic",
		"invites",
		"members",
		"reports",
	],
	coordinator: [
		"overview",
		"accessReviews",
		"applications",
		"placements",
		"attendance",
		"academic",
		"invites",
		"reports",
	],
	advisor: [
		"overview",
		"applications",
		"placements",
		"attendance",
		"progress",
		"cwie",
		"documents",
		"evaluations",
	],
	student: [
		"overview",
		"profile",
		"internships",
		"applications",
		"placements",
		"attendance",
		"progress",
		"cwie",
		"documents",
		"evaluations",
	],
	company_admin: [
		"overview",
		"accessReviews",
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
		"cwie",
		"documents",
		"evaluations",
	],
};

export function getNavigationForRole(role: OrganizationRole) {
	return roleNavigation[role];
}

const primaryRoleNavigation: Partial<Record<OrganizationRole, readonly NavigationKey[]>> = {
	student: ["overview", "requests", "internship", "history", "evaluations"],
	advisor: ["overview", "approvals", "students", "evaluations"],
};

export function getPrimaryNavigationForRole(role: OrganizationRole) {
	return primaryRoleNavigation[role] ?? roleNavigation[role];
}

export function canReviewAccessRequests(role: OrganizationRole | undefined) {
	return role === "university_admin" || role === "coordinator" || role === "company_admin";
}
