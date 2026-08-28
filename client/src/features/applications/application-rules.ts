export type ApplicationStatus = "submitted" | "under_review" | "accepted" | "rejected" | "withdrawn";

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
	submitted: "ส่งใบสมัครแล้ว",
	under_review: "กำลังตรวจสอบ",
	accepted: "ผ่านการคัดเลือก",
	rejected: "ไม่ผ่านการคัดเลือก",
	withdrawn: "ถอนใบสมัคร",
};

export function canWithdrawApplication(status: ApplicationStatus) {
	return status === "submitted" || status === "under_review";
}

export function availableReviewActions(status: ApplicationStatus, isCompanyAdmin: boolean) {
	if (status === "submitted") return isCompanyAdmin ? ["under_review", "accepted", "rejected"] as const : ["under_review"] as const;
	if (status === "under_review" && isCompanyAdmin) return ["accepted", "rejected"] as const;
	return [];
}
