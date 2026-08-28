import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock3, GraduationCap, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { organizationTypeForRole, roleOptions, type OnboardingRole } from "./onboarding-rules";

async function loadOnboarding() {
	const response = await apiClient.api.v1.onboarding.me.$get();
	if (!response.ok) throw new Error("ONBOARDING_FAILED");
	return response.json();
}

async function loadAvailableOrganizations() {
	const response = await apiClient.api.v1.onboarding.organizations.$get();
	if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
	return response.json();
}

export function OnboardingPage() {
	const queryClient = useQueryClient();
	const [role, setRole] = useState<OnboardingRole | null>(null);
	const mine = useQuery({ queryKey: ["onboarding", "me"], queryFn: loadOnboarding });
	const organizations = useQuery({ queryKey: ["onboarding", "organizations"], queryFn: loadAvailableOrganizations });
	const submit = useMutation({
		mutationFn: async (payload: Parameters<typeof apiClient.api.v1.onboarding.$post>[0]["json"]) => {
			const response = await apiClient.api.v1.onboarding.$post({ json: payload });
			if (!response.ok) throw new Error(`ONBOARDING_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			await Promise.all([queryClient.invalidateQueries({ queryKey: ["onboarding"] }), queryClient.invalidateQueries({ queryKey: ["organizations"] })]);
		},
	});

	if (mine.isLoading) return <Loading />;
	if (mine.data?.data && mine.data.data.status !== "revision_requested") return <RequestStatus request={mine.data.data} />;
	const revisionRequest = mine.data?.data?.status === "revision_requested" ? mine.data.data : null;
	if (!role && !revisionRequest) return <RoleSelection onSelect={setRole} />;
	const selectedRole = role ?? revisionRequest?.requestedRole as OnboardingRole;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedRole) return;
		const data = new FormData(event.currentTarget);
		const value = (key: string) => String(data.get(key) ?? "").trim();
		const profile = { fullName: value("fullName"), email: value("email"), phone: value("phone") };
		let payload: Parameters<typeof apiClient.api.v1.onboarding.$post>[0]["json"];
		if (selectedRole === "student") payload = { requestedRole: selectedRole, targetOrganizationId: value("organizationId"), profile: { ...profile, studentId: value("studentId"), faculty: value("faculty"), major: value("major"), yearLevel: value("yearLevel") } };
		else if (selectedRole === "advisor") payload = { requestedRole: selectedRole, targetOrganizationId: value("organizationId"), profile: { ...profile, faculty: value("faculty"), department: value("department"), academicTitle: value("academicTitle") || undefined, employeeId: value("employeeId") || undefined } };
		else if (selectedRole === "coordinator" || selectedRole === "university_admin") payload = { requestedRole: selectedRole, targetOrganizationId: value("organizationId"), profile: { ...profile, department: value("department"), jobTitle: value("jobTitle"), employeeId: value("employeeId") || undefined } };
		else if (selectedRole === "supervisor") payload = { requestedRole: selectedRole, targetOrganizationId: value("organizationId"), profile: { ...profile, department: value("department"), jobTitle: value("jobTitle"), expertise: value("expertise") || undefined } };
		else payload = { requestedRole: selectedRole, profile: { ...profile, department: value("department"), jobTitle: value("jobTitle") }, organization: { name: value("companyName"), slug: value("companySlug"), registrationNumber: value("registrationNumber"), businessType: value("businessType"), address: value("address"), website: value("website") || undefined, email: value("companyEmail"), phone: value("companyPhone"), evidenceReference: value("evidenceReference") } };
		submit.mutate(payload);
	}

	const targetType = organizationTypeForRole(selectedRole);
	const available = organizations.data?.data.filter((item) => item.type === targetType) ?? [];
	return <div className="mx-auto max-w-3xl">{!revisionRequest && <button type="button" className="text-sm font-medium text-primary" onClick={() => setRole(null)}>← เปลี่ยนประเภทผู้ใช้งาน</button>}<div className="mt-5 rounded-3xl border bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold text-primary">FIRST-TIME SETUP</p><h1 className="mt-2 text-3xl font-black">กรอกข้อมูลเพื่อเข้าใช้งาน</h1><p className="mt-2 text-muted-foreground">ข้อมูลนี้ใช้ตรวจสอบบทบาทและเชื่อมคุณกับองค์กรที่ถูกต้อง</p><form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>{revisionRequest?.reviewNote && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">สิ่งที่ต้องแก้ไข: {revisionRequest.reviewNote}</div>}<Field name="fullName" label="ชื่อ–นามสกุล" /><Field name="email" label="อีเมลติดต่อ" type="email" /><Field name="phone" label="เบอร์โทรศัพท์" />{targetType && <label className="grid gap-2 text-sm font-semibold sm:col-span-2">องค์กร<select name="organizationId" required className="h-11 rounded-xl border bg-background px-3 font-normal"><option value="">เลือกองค์กร</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<RoleFields role={selectedRole} /><div className="sm:col-span-2">{submit.isError && <p role="alert" className="mb-3 text-sm text-destructive">ส่งข้อมูลไม่สำเร็จ กรุณาตรวจสอบข้อมูลหรือติดต่อผู้ดูแล</p>}<Button className="w-full" size="lg" disabled={submit.isPending}>{submit.isPending ? "กำลังส่งข้อมูล..." : selectedRole === "student" ? "ยืนยันและเริ่มใช้งาน" : revisionRequest ? "ส่งข้อมูลที่แก้ไขอีกครั้ง" : "ส่งคำขอเพื่อตรวจสอบ"}</Button></div></form></div></div>;
}

function RoleSelection({ onSelect }: { onSelect: (role: OnboardingRole) => void }) { return <div className="mx-auto max-w-5xl"><div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf3ff] text-primary"><UserRoundCheck /></span><h1 className="mt-5 text-3xl font-black">คุณเข้าใช้งาน Trainy ในบทบาทใด?</h1><p className="mt-3 text-muted-foreground">เลือกบทบาทที่ตรงกับหน้าที่จริง ระบบจะขอข้อมูลและการยืนยันที่เหมาะสม</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{roleOptions.map((option) => <button type="button" key={option.value} onClick={() => onSelect(option.value)} className="rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"><span className="grid size-10 place-items-center rounded-xl bg-[#edf3ff] text-primary">{option.value === "student" ? <GraduationCap /> : option.value.includes("company") || option.value === "supervisor" ? <Building2 /> : <ShieldCheck />}</span><span className="mt-4 block font-bold">{option.label}</span><span className="mt-2 block text-sm leading-6 text-muted-foreground">{option.description}</span></button>)}</div></div>; }

function RoleFields({ role }: { role: OnboardingRole }) {
	if (role === "student") return <><Field name="studentId" label="รหัสนักศึกษา" /><Field name="yearLevel" label="ชั้นปี" /><Field name="faculty" label="คณะ" /><Field name="major" label="สาขา" /></>;
	if (role === "advisor") return <><Field name="faculty" label="คณะ" /><Field name="department" label="ภาควิชา/สาขา" /><Field name="academicTitle" label="ตำแหน่งทางวิชาการ (ถ้ามี)" required={false} /><Field name="employeeId" label="รหัสบุคลากร (ถ้ามี)" required={false} /></>;
	if (role === "company_admin") return <><Field name="department" label="แผนกของผู้สมัคร" /><Field name="jobTitle" label="ตำแหน่งของผู้สมัคร" /><Field name="companyName" label="ชื่อบริษัท" /><Field name="companySlug" label="รหัสบริษัทภาษาอังกฤษ" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /><Field name="registrationNumber" label="เลขทะเบียนนิติบุคคล" /><Field name="businessType" label="ประเภทธุรกิจ" /><Field name="companyEmail" label="อีเมลบริษัท" type="email" /><Field name="companyPhone" label="เบอร์โทรบริษัท" /><Field name="website" label="เว็บไซต์ (ถ้ามี)" type="url" required={false} /><Field name="evidenceReference" label="เลขอ้างอิงเอกสารที่ส่งให้ CWIE" /><label className="grid gap-2 text-sm font-semibold sm:col-span-2">ที่อยู่บริษัท<textarea name="address" required minLength={10} className="min-h-24 rounded-xl border bg-background p-3 font-normal" /></label></>;
	return <><Field name="department" label="หน่วยงาน/แผนก" /><Field name="jobTitle" label="ตำแหน่ง" />{role !== "supervisor" && <Field name="employeeId" label="รหัสบุคลากร (ถ้ามี)" required={false} />}{role === "supervisor" && <Field name="expertise" label="ความเชี่ยวชาญ (ถ้ามี)" required={false} />}</>;
}

function Field({ name, label, required = true, ...props }: { name: string; label: string; required?: boolean; type?: string; pattern?: string }) { return <label className="grid gap-2 text-sm font-semibold">{label}<input name={name} required={required} minLength={required ? 2 : undefined} className="h-11 rounded-xl border bg-background px-3 font-normal outline-none focus:border-primary focus:ring-3 focus:ring-primary/10" {...props} /></label>; }
function Loading() { return <div className="grid min-h-80 place-items-center text-muted-foreground">กำลังตรวจสอบข้อมูลการเข้าใช้งาน...</div>; }
function RequestStatus({ request }: { request: { status: string; requestedRole: string; reviewNote?: string | null } }) { const approved = request.status === "approved"; return <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center"><span className={`mx-auto grid size-14 place-items-center rounded-2xl ${approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{approved ? <CheckCircle2 /> : <Clock3 />}</span><h1 className="mt-5 text-2xl font-black">{approved ? "ยืนยันข้อมูลเรียบร้อย" : request.status === "revision_requested" ? "กรุณาแก้ไขข้อมูล" : request.status === "rejected" ? "คำขอไม่ผ่านการอนุมัติ" : "กำลังรอการตรวจสอบ"}</h1><p className="mt-3 text-muted-foreground">บทบาทที่ขอ: {request.requestedRole}</p>{request.reviewNote && <div className="mt-5 rounded-xl bg-muted p-4 text-left text-sm">หมายเหตุ: {request.reviewNote}</div>}</div>; }
