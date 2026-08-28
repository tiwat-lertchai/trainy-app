export type DocumentStatus = "submitted" | "approved" | "rejected";

export function canReviewDocument(status: DocumentStatus, assignedReviewer: boolean) {
	return assignedReviewer && status === "submitted";
}

export function documentStatusLabel(status: DocumentStatus) {
	return { submitted: "รอตรวจ", approved: "อนุมัติแล้ว", rejected: "ไม่ผ่านการตรวจ" }[status];
}

export function documentTypeLabel(type: string) {
	return { resume: "ประวัติย่อ", consent: "หนังสือยินยอม", progress_evidence: "หลักฐานความก้าวหน้า", final_report: "รายงานฉบับสมบูรณ์", other: "เอกสารอื่น" }[type] ?? type;
}
