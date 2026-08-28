export type OnboardingRole = "student" | "advisor" | "coordinator" | "university_admin" | "company_admin" | "supervisor";

export const roleOptions: Array<{ value: OnboardingRole; label: string; description: string }> = [
	{ value: "student", label: "นักศึกษา", description: "ค้นหาและสมัครฝึกงานได้ทันทีหลังกรอกข้อมูล" },
	{ value: "advisor", label: "อาจารย์ที่ปรึกษา", description: "รอผู้ดูแลมหาวิทยาลัยตรวจสอบ" },
	{ value: "coordinator", label: "เจ้าหน้าที่/ผู้ประสานงาน", description: "รอผู้ดูแลมหาวิทยาลัยตรวจสอบ" },
	{ value: "university_admin", label: "ผู้ดูแลมหาวิทยาลัย", description: "รอเจ้าหน้าที่ CWIE ตรวจสอบ" },
	{ value: "company_admin", label: "ผู้แทนสถานประกอบการ", description: "รอเจ้าหน้าที่ CWIE ตรวจเอกสารบริษัท" },
	{ value: "supervisor", label: "พี่เลี้ยง/ผู้ควบคุมการฝึกงาน", description: "รอผู้ดูแลสถานประกอบการตรวจสอบ" },
];

export function organizationTypeForRole(role: OnboardingRole) {
	if (role === "company_admin") return null;
	return role === "supervisor" ? "company" : "university";
}

export function isImmediatelyApproved(role: OnboardingRole) {
	return role === "student";
}
