export type ApplicationStatus =
	"submitted" | "under_review" | "accepted" | "rejected" | "withdrawn";

export const applicationStatusKeys: Record<ApplicationStatus, MessageKey> = {
	submitted: "status.submitted",
	under_review: "status.underReview",
	accepted: "status.accepted",
	rejected: "status.rejected",
	withdrawn: "status.withdrawn",
};

export function canWithdrawApplication(status: ApplicationStatus) {
	return status === "submitted" || status === "under_review";
}

export function availableReviewActions(status: ApplicationStatus, isCompanyAdmin: boolean) {
	if (status === "submitted")
		return isCompanyAdmin
			? (["under_review", "accepted", "rejected"] as const)
			: (["under_review"] as const);
	if (status === "under_review" && isCompanyAdmin) return ["accepted", "rejected"] as const;
	return [];
}
import type { MessageKey } from "@/i18n/messages";
