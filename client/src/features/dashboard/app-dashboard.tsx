import { useQuery } from "@tanstack/react-query";
import { Bell, BriefcaseBusiness, Building2, ChevronRight, ClipboardCheck, FileCheck2, FileText, LayoutDashboard, LogOut, Menu, Search, Settings, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { authClient, signInWithLine } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { getNavigationForRole, type NavigationKey, type OrganizationRole } from "@/features/organizations/role-navigation";

const navigationDetails: Record<NavigationKey, { label: string; icon: typeof LayoutDashboard }> = {
	overview: { label: "ภาพรวม", icon: LayoutDashboard }, internships: { label: "ตำแหน่งฝึกงาน", icon: BriefcaseBusiness },
	applications: { label: "ใบสมัคร", icon: ClipboardCheck }, placements: { label: "การฝึกงาน", icon: Building2 },
	progress: { label: "รายงานความก้าวหน้า", icon: FileText }, documents: { label: "เอกสาร", icon: FileCheck2 },
	evaluations: { label: "การประเมินผล", icon: ClipboardCheck }, members: { label: "สมาชิก", icon: UsersRound }, reports: { label: "รายงานองค์กร", icon: FileText },
};

const roleLabels: Record<OrganizationRole, string> = {
	university_admin: "ผู้ดูแลมหาวิทยาลัย", coordinator: "ผู้ประสานงาน", advisor: "อาจารย์ที่ปรึกษา",
	student: "นักศึกษา", company_admin: "ผู้ดูแลสถานประกอบการ", supervisor: "ผู้ควบคุมการฝึกงาน",
};

async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) throw new Error(response.status === 401 ? "UNAUTHORIZED" : "ORGANIZATIONS_FAILED");
	return response.json();
}

export function AppDashboard() {
	const session = authClient.useSession();
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations, enabled: Boolean(session.data?.user) });

	if (session.isPending) return <FullPageMessage title="กำลังตรวจสอบการเข้าสู่ระบบ" />;
	if (!session.data?.user) return <SignedOut />;
	const user = session.data.user;
	const activeContext = organizations.data?.data[0];
	const role = activeContext?.membership.role as OrganizationRole | undefined;
	const navigation = role ? getNavigationForRole(role) : (["overview"] as const);

	return (
		<div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
			<aside className="hidden min-h-screen bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
				<div className="flex h-20 items-center border-b border-white/10 px-6"><BrandMark /></div>
				<nav className="flex-1 space-y-1 p-4" aria-label="Application navigation">
					{navigation.map((key, index) => { const { label, icon: Icon } = navigationDetails[key]; return <button key={key} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${index === 0 ? "bg-white/12 text-white" : "text-slate-300 hover:bg-white/7 hover:text-white"}`}><Icon className="size-5" />{label}</button>; })}
				</nav>
				<div className="border-t border-white/10 p-4"><button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/7"><Settings className="size-5" />ตั้งค่า</button></div>
			</aside>

			<div className="min-w-0">
				<header className="flex h-20 items-center gap-4 border-b bg-white px-5 sm:px-8">
					<Button className="lg:hidden" variant="ghost" size="icon" aria-label="Open navigation"><Menu /></Button>
					<div className="hidden max-w-md flex-1 items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-muted-foreground sm:flex"><Search className="size-4" /><span className="text-sm">ค้นหาใน Trainy</span></div>
					<div className="ml-auto flex items-center gap-2"><Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div><span className="grid size-10 place-items-center rounded-full bg-[#edf3ff] font-bold text-primary">{user.name.slice(0, 1).toUpperCase()}</span></div>
				</header>

				<main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
					<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">{activeContext ? `${activeContext.organization.name} · ${role ? roleLabels[role] : ""}` : "TRAINY WORKSPACE"}</p><h1 className="mt-2 text-3xl font-black tracking-tight">สวัสดี, {user.name}</h1><p className="mt-2 text-muted-foreground">ติดตามงานสำคัญและสถานะการฝึกงานของคุณ</p></div><Button variant="outline" onClick={() => authClient.signOut()}><LogOut />ออกจากระบบ</Button></div>
					<section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
						<StatCard label="องค์กรของฉัน" value={organizations.data?.data.length ?? "—"} icon={Building2} />
						<StatCard label="รายการที่ต้องทำ" value="3" icon={ClipboardCheck} accent />
						<StatCard label="รายงานที่ส่งแล้ว" value="8" icon={FileText} />
						<StatCard label="ผู้ประสานงาน" value="2" icon={UsersRound} />
					</section>
					<section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
						<div className="rounded-2xl border bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">สิ่งที่ต้องทำต่อ</h2><p className="mt-1 text-sm text-muted-foreground">เรียงตามกำหนดส่งและความสำคัญ</p></div><Button variant="ghost" size="sm">ดูทั้งหมด<ChevronRight /></Button></div><div className="mt-5 divide-y"><Task title="ส่งรายงานความก้าวหน้าสัปดาห์ที่ 4" meta="ครบกำหนดวันนี้" urgent /><Task title="ตรวจสอบข้อมูลสถานที่ฝึกงาน" meta="ภายในวันศุกร์" /><Task title="อัปโหลดเอกสารยินยอม" meta="ภายใน 5 วัน" /></div></div>
						<div className="rounded-2xl border bg-white p-6"><h2 className="text-lg font-bold">องค์กรของฉัน</h2>{organizations.isLoading && <p className="mt-4 text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>}{organizations.isError && <p role="alert" className="mt-4 text-sm text-destructive">ไม่สามารถโหลดข้อมูลองค์กรได้</p>}{organizations.data?.data.map((item) => <div key={item.organization.id} className="mt-4 flex items-center gap-3 rounded-xl bg-muted p-4"><span className="grid size-10 place-items-center rounded-lg bg-white text-primary"><Building2 className="size-5" /></span><div className="min-w-0"><p className="truncate font-semibold">{item.organization.name}</p><p className="text-xs text-muted-foreground">{roleLabels[item.membership.role as OrganizationRole]}</p></div></div>)}</div>
					</section>
				</main>
			</div>
		</div>
	);
}

function SignedOut() { return <div className="grid min-h-screen place-items-center bg-background p-5"><div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-xl shadow-slate-900/5"><BrandMark className="justify-center" /><div className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-[#edf3ff] text-primary"><BriefcaseBusiness /></div><h1 className="mt-5 text-2xl font-black">เข้าสู่ระบบเพื่อเปิดพื้นที่ทำงาน</h1><p className="mt-3 leading-7 text-muted-foreground">Trainy ใช้ LINE เพื่อยืนยันตัวตนอย่างปลอดภัย</p><Button className="mt-7 w-full" size="lg" onClick={() => signInWithLine()}>เข้าสู่ระบบด้วย LINE</Button><a href="/" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">กลับหน้าหลัก</a></div></div>; }
function FullPageMessage({ title }: { title: string }) { return <div className="grid min-h-screen place-items-center"><p className="font-semibold text-muted-foreground">{title}</p></div>; }
function StatCard({ label, value, icon: Icon, accent = false }: { label: string; value: string | number; icon: typeof Building2; accent?: boolean }) { return <div className="rounded-2xl border bg-white p-5"><div className={`grid size-10 place-items-center rounded-xl ${accent ? "bg-accent/10 text-accent" : "bg-[#edf3ff] text-primary"}`}><Icon className="size-5" /></div><p className="mt-5 text-3xl font-black">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>; }
function Task({ title, meta, urgent = false }: { title: string; meta: string; urgent?: boolean }) { return <div className="flex items-center gap-4 py-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-primary"><ClipboardCheck className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{title}</p><p className={`mt-1 text-sm ${urgent ? "font-medium text-destructive" : "text-muted-foreground"}`}>{meta}</p></div><ChevronRight className="size-4 text-muted-foreground" /></div>; }
