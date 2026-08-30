export type DocumentStatus = "submitted" | "approved" | "rejected";
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export function canReviewDocument(status: DocumentStatus, assignedReviewer: boolean) {
	return assignedReviewer && status === "submitted";
}

export const documentStatusKeys = {
	submitted: "documents.status.submitted",
	approved: "documents.status.approved",
	rejected: "documents.status.rejected",
} satisfies Record<DocumentStatus, MessageKey>;

export const documentTypeKeys = {
	resume: "documents.type.resume",
	consent: "documents.type.consent",
	progress_evidence: "documents.type.progressEvidence",
	final_report: "documents.type.finalReport",
	other: "documents.type.other",
} satisfies Record<string, MessageKey>;

export function validateDocumentFile(file: Pick<File, "size" | "type">) {
	if (file.size < 1) return "documents.validation.empty" as const;
	if (file.size > MAX_DOCUMENT_BYTES) return "documents.validation.tooLarge" as const;
	if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number]))
		return "documents.validation.type" as const;
	return null;
}
import type { MessageKey } from "@/i18n/messages";
