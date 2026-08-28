import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import { availableInternshipActions, formatWorkMode } from "./internship-format";

export function CompanyInternshipPage({ organizationId, canManage }: { organizationId: string; canManage: boolean }) {
	const { t } = useLanguage();
	const queryClient = useQueryClient();
	const [showForm, setShowForm] = useState(false);
	const [closingId, setClosingId] = useState<string | null>(null);
	const internships = useQuery({
		queryKey: ["internships", "company", organizationId],
		queryFn: async () => {
			const response = await apiClient.api.v1.internships.companies[":organizationId"].$get({ param: { organizationId } });
			if (!response.ok) throw new Error("INTERNSHIPS_FAILED");
			return response.json();
		},
	});
	const create = useMutation({
		mutationFn: async (json: Parameters<typeof apiClient.api.v1.internships.companies[":organizationId"]["$post"]>[0]["json"]) => {
			const response = await apiClient.api.v1.internships.companies[":organizationId"].$post({ param: { organizationId }, json });
			if (!response.ok) throw new Error(`INTERNSHIP_${response.status}`);
			return response.json();
		},
		onSuccess: async () => { setShowForm(false); await queryClient.invalidateQueries({ queryKey: ["internships", "company", organizationId] }); },
	});
	const changeStatus = useMutation({
		mutationFn: async ({ id, status }: { id: string; status: "published" | "closed" }) => {
			const response = await apiClient.api.v1.internships[":internshipId"].$patch({ param: { internshipId: id }, json: { status } });
			if (!response.ok) throw new Error(`INTERNSHIP_${response.status}`);
			return response.json();
		},
		onSuccess: async () => { setClosingId(null); await queryClient.invalidateQueries({ queryKey: ["internships"] }); },
	});

	function handleCreate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		create.mutate({
			title: String(data.get("title")), description: String(data.get("description")), location: String(data.get("location")),
			workMode: String(data.get("workMode")) as "onsite" | "hybrid" | "remote", capacity: Number(data.get("capacity")),
			applicationDeadline: new Date(String(data.get("applicationDeadline"))).toISOString(),
		});
	}

	return <div><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">COMPANY INTERNSHIPS</p><h1 className="mt-2 text-3xl font-black">ตำแหน่งฝึกงานของบริษัท</h1><p className="mt-2 text-muted-foreground">สร้างตำแหน่งเป็นฉบับร่าง ตรวจสอบ แล้วจึงเปิดรับสมัคร</p></div>{canManage && <Button onClick={() => setShowForm((value) => !value)}><Plus />{showForm ? "ปิดแบบฟอร์ม" : "สร้างตำแหน่ง"}</Button>}</div>
		{showForm && <form onSubmit={handleCreate} className="mt-8 grid gap-5 rounded-2xl border bg-white p-6 sm:grid-cols-2"><Field name="title" label="ชื่อตำแหน่ง" /><Field name="location" label="สถานที่ทำงาน" /><label className="grid gap-2 text-sm font-semibold">รูปแบบการทำงาน<select name="workMode" className="h-11 rounded-xl border bg-background px-3 font-normal"><option value="onsite">ที่สถานประกอบการ</option><option value="hybrid">ไฮบริด</option><option value="remote">ทางไกล</option></select></label><Field name="capacity" label="จำนวนที่รับ" type="number" min="1" /><Field name="applicationDeadline" label="วันปิดรับสมัคร" type="datetime-local" /><label className="grid gap-2 text-sm font-semibold sm:col-span-2">รายละเอียด<textarea name="description" required minLength={20} maxLength={10000} className="min-h-36 rounded-xl border bg-background p-3 font-normal" /></label>{create.isError && <p role="alert" className="text-sm text-destructive sm:col-span-2">สร้างตำแหน่งไม่สำเร็จ โปรดตรวจสอบวันปิดรับสมัครและข้อมูล</p>}<Button className="sm:col-span-2" disabled={create.isPending}>{create.isPending ? "กำลังบันทึก..." : "บันทึกเป็นฉบับร่าง"}</Button></form>}
		{internships.isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted" />}{internships.isError && <div role="alert" className="mt-8 rounded-2xl border border-destructive/20 bg-white p-6 text-destructive">ไม่สามารถโหลดตำแหน่งของบริษัทได้</div>}{internships.data?.data.length === 0 && <div className="mt-8 rounded-2xl border bg-white p-10 text-center text-muted-foreground">ยังไม่มีตำแหน่งฝึกงาน</div>}
		<div className="mt-8 grid gap-5 md:grid-cols-2">{internships.data?.data.map((internship) => <article key={internship.id} className="rounded-2xl border bg-white p-6"><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary"><BriefcaseBusiness /></span><Status status={internship.status} /></div><h2 className="mt-5 text-xl font-bold">{internship.title}</h2><p className="mt-2 line-clamp-3 leading-7 text-muted-foreground">{internship.description}</p><div className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"><span className="flex items-center gap-2"><MapPin className="size-4" />{internship.location}</span><span className="flex items-center gap-2"><BriefcaseBusiness className="size-4" />{formatWorkMode(internship.workMode)}</span><span className="flex items-center gap-2"><Users className="size-4" />รับ {internship.capacity} คน</span><span className="flex items-center gap-2"><CalendarDays className="size-4" />{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(internship.applicationDeadline))}</span></div><div className="mt-5 flex flex-wrap gap-2">{availableInternshipActions(internship.status, canManage).map((status) => <Button key={status} variant={status === "closed" ? "outline" : "default"} disabled={changeStatus.isPending} onClick={() => status === "closed" ? setClosingId(internship.id) : changeStatus.mutate({ id: internship.id, status })}>{status === "published" ? "เปิดรับสมัคร" : "ปิดตำแหน่ง"}</Button>)}</div>{changeStatus.isError && changeStatus.variables?.id === internship.id && <p role="alert" className="mt-3 text-sm text-destructive">เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่</p>}</article>)}</div><ConfirmationDialog open={Boolean(closingId)} title={t("confirm.terminalTitle")} description={t("confirm.irreversible")} confirmLabel={t("common.confirm")} cancelLabel={t("common.cancel")} destructive pending={changeStatus.isPending} onCancel={() => setClosingId(null)} onConfirm={() => closingId && changeStatus.mutate({ id: closingId, status: "closed" })} /></div>;
}

function Field({ name, label, type = "text", min }: { name: string; label: string; type?: string; min?: string }) { return <label className="grid gap-2 text-sm font-semibold">{label}<input name={name} type={type} min={min} required className="h-11 rounded-xl border bg-background px-3 font-normal" /></label>; }
function Status({ status }: { status: "draft" | "published" | "closed" }) { const labels = { draft: "ฉบับร่าง", published: "เปิดรับสมัคร", closed: "ปิดแล้ว" }; return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{labels[status]}</span>; }
