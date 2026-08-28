import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ClipboardCheck, UsersRound } from "lucide-react";
import { apiClient } from "@/lib/api-client";

const WORKSPACE_KEY = "trainy-workspace-id";
const statusLabels: Record<string, string> = {
	pending: "รอมอบหมาย", active: "กำลังฝึกงาน", completed: "เสร็จสิ้น", cancelled: "ยกเลิก",
	submitted: "รอตรวจ", under_review: "กำลังพิจารณา", accepted: "รับเข้า", rejected: "ปฏิเสธ", withdrawn: "ถอนใบสมัคร",
};

export function ReportsPage() {
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: async () => { const r = await apiClient.api.v1.organizations.$get(); if (!r.ok) throw new Error(); return r.json(); } });
	const context = organizations.data?.data.find((item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY)) ?? organizations.data?.data[0];
	const organizationId = context?.organization.id;
	const isAdmin = context?.membership.role === "university_admin" || context?.membership.role === "company_admin";

	const report = useQuery({
		queryKey: ["reports", organizationId],
		queryFn: async () => { const r = await apiClient.api.v1.reports.organizations[":organizationId"].$get({ param: { organizationId: organizationId! } }); if (!r.ok) throw new Error(); return r.json(); },
		enabled: Boolean(organizationId) && isAdmin,
	});

	if (organizations.isLoading) return <div className="grid min-h-80 place-items-center text-muted-foreground">กำลังโหลดข้อมูล...</div>;
	if (!isAdmin) return <div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center text-muted-foreground">หน้านี้สำหรับผู้ดูแลองค์กรเท่านั้น</div>;

	const data = report.data?.data;
	return (
		<div>
			<p className="text-sm font-semibold text-primary">REPORTS</p>
			<h1 className="mt-2 text-3xl font-black">รายงานองค์กร</h1>
			<p className="mt-2 text-muted-foreground">ภาพรวมสมาชิกและสถานะการฝึกงานของ {context?.organization.name}</p>

			{report.isLoading && <div className="mt-8 h-32 animate-pulse rounded-2xl bg-muted" />}
			{report.isError && <div role="alert" className="mt-8 rounded-2xl border border-destructive/20 bg-white p-6 text-destructive">โหลดรายงานไม่สำเร็จ</div>}

			{data && (
				<>
					<section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						<Stat icon={UsersRound} label="สมาชิกที่ใช้งานอยู่" value={data.activeMembers} />
						{data.internships !== undefined && <Stat icon={BriefcaseBusiness} label="ตำแหน่งฝึกงานทั้งหมด" value={data.internships} />}
						<Stat icon={ClipboardCheck} label="ใบสมัครทั้งหมด" value={data.applications.reduce((sum, item) => sum + item.count, 0)} />
					</section>
					<section className="mt-6 grid gap-6 sm:grid-cols-2">
						<StatusBreakdown title="ใบสมัครแยกตามสถานะ" counts={data.applications} />
						<StatusBreakdown title="การฝึกงานแยกตามสถานะ" counts={data.placements} />
					</section>
				</>
			)}
		</div>
	);
}

function Stat({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: number }) {
	return <div className="rounded-2xl border bg-white p-6"><span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary"><Icon /></span><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>;
}

function StatusBreakdown({ title, counts }: { title: string; counts: Array<{ status: string; count: number }> }) {
	return (
		<div className="rounded-2xl border bg-white p-6">
			<h2 className="font-bold">{title}</h2>
			{counts.length === 0 && <p className="mt-4 text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>}
			<div className="mt-4 grid gap-2">
				{counts.map((item) => (
					<div key={item.status} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
						<span>{statusLabels[item.status] ?? item.status}</span>
						<span className="font-bold">{item.count}</span>
					</div>
				))}
			</div>
		</div>
	);
}
