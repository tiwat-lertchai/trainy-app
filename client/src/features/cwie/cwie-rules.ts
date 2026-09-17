import type { OrganizationRole } from "@/features/organizations/role-navigation";

export function canEditCwie(status: string, role: OrganizationRole | undefined) {
	return role === "student" && (status === "draft" || status === "revision_requested");
}

export function canReviewCwie(status: string, role: OrganizationRole | undefined) {
	return (role === "advisor" || role === "supervisor") && status === "submitted";
}

export function canManageCwieVisits(role: OrganizationRole | undefined) {
	return role === "advisor";
}
