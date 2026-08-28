export type DocumentStatus = "submitted" | "approved" | "rejected";
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

export function canReviewDocument(status: DocumentStatus, assignedReviewer: boolean) {
	return assignedReviewer && status === "submitted";
}

export function documentStatusLabel(status: DocumentStatus) {
	return { submitted: "รอตรวจ", approved: "อนุมัติแล้ว", rejected: "ไม่ผ่านการตรวจ" }[status];
}

export function documentTypeLabel(type: string) {
	return (
		{
			resume: "ประวัติย่อ",
			consent: "หนังสือยินยอม",
			progress_evidence: "หลักฐานความก้าวหน้า",
			final_report: "รายงานฉบับสมบูรณ์",
			other: "เอกสารอื่น",
		}[type] ?? type
	);
}

export function validateDocumentFile(file: Pick<File, "size" | "type">) {
	if (file.size < 1) return "ไฟล์ต้องไม่ว่างเปล่า";
	if (file.size > MAX_DOCUMENT_BYTES) return "ไฟล์ต้องมีขนาดไม่เกิน 20 MB";
	if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number]))
		return "รองรับเฉพาะไฟล์ PDF, JPEG และ PNG";
	return null;
}
