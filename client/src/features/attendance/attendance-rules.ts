import type { OrganizationRole } from "@/features/organizations/role-navigation";
import type { MessageKey } from "@/i18n/messages";

export function canManageSchedule(role?: OrganizationRole) {
	return role === "company_admin";
}

export function canCheckInOut(role?: OrganizationRole) {
	return role === "student";
}

export function canReviewAdjustments(role?: OrganizationRole) {
	return role === "advisor" || role === "supervisor";
}

export function canViewUniversitySummary(role?: OrganizationRole) {
	return role === "university_admin" || role === "coordinator" || role === "advisor";
}

export function formatNetMinutes(minutes: number | null | undefined, hour = "hr", minute = "min") {
	if (minutes == null) return "-";
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;
	return `${hours} ${hour} ${remainder} ${minute}`;
}

export const attendanceStatusKeys: Record<string, MessageKey> = {
	checked_in: "attendance.status.checkedIn",
	complete: "attendance.status.complete",
	late: "attendance.status.late",
	left_early: "attendance.status.leftEarly",
	late_and_left_early: "attendance.status.lateAndLeftEarly",
	incomplete: "attendance.status.incomplete",
};
export const adjustmentStatusKeys: Record<string, MessageKey> = {
	pending: "attendance.adjustment.pending",
	approved: "attendance.adjustment.approved",
	rejected: "attendance.adjustment.rejected",
};
