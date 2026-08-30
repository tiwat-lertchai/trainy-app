export type InternshipRequestStatus =
	"submitted" | "revision_requested" | "approved" | "rejected" | "cancelled";

export type InternshipRequestStep = "advisor" | "program_chair" | "center";

export const requestStatusKeys: Record<InternshipRequestStatus, MessageKey> = {
	submitted: "internshipRequests.status.submitted",
	revision_requested: "internshipRequests.status.revisionRequested",
	approved: "internshipRequests.status.approved",
	rejected: "internshipRequests.status.rejected",
	cancelled: "internshipRequests.status.cancelled",
};

export const requestStepKeys: Record<InternshipRequestStep, MessageKey> = {
	advisor: "internshipRequests.step.advisor",
	program_chair: "internshipRequests.step.programChair",
	center: "internshipRequests.step.center",
};

export function canCancelRequest(status: InternshipRequestStatus) {
	return status === "submitted" || status === "revision_requested";
}

export function canResubmitRequest(status: InternshipRequestStatus) {
	return status === "revision_requested";
}
import type { MessageKey } from "@/i18n/messages";
