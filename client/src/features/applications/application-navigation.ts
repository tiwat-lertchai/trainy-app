import type { OrganizationRole } from "@/features/organizations/role-navigation";

export const studentApplicationPaths = {
	browseInternships: "/app/internships",
	selfArrangedRequest: "/app/internship-request",
} as const;

export function canAccessStudentRequest(role?: OrganizationRole) {
	return role === "student";
}

export function studentApplicationActionPlacement(
	role: OrganizationRole | undefined,
	applicationCount: number | undefined,
) {
	if (role !== "student" || applicationCount === undefined) return "hidden" as const;
	return applicationCount === 0 ? ("empty-state" as const) : ("header" as const);
}
