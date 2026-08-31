import type { OrganizationRole } from "@/features/organizations/role-navigation";

export const studentApplicationPaths = {
	browseInternships: "/app/internships",
	selfArrangedRequest: "/app/internship-request",
} as const;

export function canAccessStudentRequest(role?: OrganizationRole) {
	return role === "student";
}
