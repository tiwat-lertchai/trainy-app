import type { OrganizationRole } from "@/features/organizations/role-navigation";

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

export function formatNetMinutes(minutes: number | null | undefined) {
	if (minutes == null) return "-";
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;
	return `${hours} ชม. ${remainder} นาที`;
}

const statusLabels: Record<string, string> = {
	checked_in: "กำลังปฏิบัติงาน",
	complete: "ครบชั่วโมง",
	late: "มาสาย",
	left_early: "ออกก่อนเวลา",
	late_and_left_early: "มาสายและออกก่อนเวลา",
	incomplete: "ไม่ครบชั่วโมง",
};

export function attendanceStatusLabel(status: string) {
	return statusLabels[status] ?? status;
}

const adjustmentStatusLabels: Record<string, string> = {
	pending: "รอตรวจสอบ",
	approved: "อนุมัติแล้ว",
	rejected: "ปฏิเสธ",
};

export function adjustmentStatusLabel(status: string) {
	return adjustmentStatusLabels[status] ?? status;
}
