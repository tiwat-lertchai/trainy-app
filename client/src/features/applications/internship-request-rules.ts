export type InternshipRequestStatus =
	"submitted" | "revision_requested" | "approved" | "rejected" | "cancelled";

export type InternshipRequestStep = "advisor" | "program_chair" | "center";

export const requestStatusLabels: Record<InternshipRequestStatus, string> = {
	submitted: "รอตรวจสอบ",
	revision_requested: "รอแก้ไข",
	approved: "อนุมัติแล้ว",
	rejected: "ไม่อนุมัติ",
	cancelled: "ยกเลิกแล้ว",
};

export const requestStepLabels: Record<InternshipRequestStep, string> = {
	advisor: "อาจารย์ที่ปรึกษา",
	program_chair: "หัวหน้าหลักสูตร",
	center: "ศูนย์สหกิจศึกษา",
};

export function canCancelRequest(status: InternshipRequestStatus) {
	return status === "submitted" || status === "revision_requested";
}

export function canResubmitRequest(status: InternshipRequestStatus) {
	return status === "revision_requested";
}
