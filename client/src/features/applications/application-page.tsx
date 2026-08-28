import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CalendarDays, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { applicationStatusLabels, availableReviewActions, canWithdrawApplication, type ApplicationStatus } from "./application-rules";

const WORKSPACE_KEY = "trainy-workspace-id";

async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
	return response.json();
}

export function ApplicationPage() {
	const queryClient = useQueryClient();
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations });
	const memberships = organizations.data?.data ?? [];
	const storedId = localStorage.getItem(WORKSPACE_KEY);
	const context = memberships.find((item) => item.organization.id === storedId) ?? memberships[0];
	const organizationId = context?.organization.id;
	const role = context?.membership.role as OrganizationRole | undefined;

	const studentApplications = useQuery({
		queryKey: ["applications", "me"],
		queryFn: async () => {
			const response = await apiClient.api.v1.internships.applications.me.$get();
			if (!response.ok) throw new Error("APPLICATIONS_FAILED");
			return response.json();
		},
		enabled: role === "student",
	});

	const universityApplications = useQuery({
		queryKey: ["applications", "university", organizationId],
		queryFn: async () => {
			const response = await apiClient.api.v1.internships.universities[":organizationId"].applications.$get({ param: { organizationId: organizationId! } });
			if (!response.ok) throw new Error("APPLICATIONS_FAILED");
			return response.json();
		},
		enabled: Boolean(organizationId && ["university_admin", "coordinator", "advisor"].includes(role ?? "")),
	});

	const companyApplications = useQuery({
		queryKey: ["applications", "company", organizationId],
		queryFn: async () => {
			const internshipsResponse = await apiClient.api.v1.internships.companies[":organizationId"].$get({ param: { organizationId: organizationId! } });
			if (!internshipsResponse.ok) throw new Error("INTERNSHIPS_FAILED");
			const internships = (await internshipsResponse.json()).data;
			const groups = await Promise.all(internships.map(async (internship) => {
				const response = await apiClient.api.v1.internships[":internshipId"].applications.$get({ param: { internshipId: internship.id } });
				if (!response.ok) throw new Error("APPLICATIONS_FAILED");
				return (await response.json()).data;
			}));
			return { data: groups.flat() };
		},
		enabled: Boolean(organizationId && ["company_admin", "supervisor"].includes(role ?? "")),
	});

	const applications = role === "student" ? studentApplications : ["company_admin", "supervisor"].includes(role ?? "") ? companyApplications : universityApplications;
	const mutation = useMutation({
		mutationFn: async ({ id, action }: { id: string; action: "withdrawn" | "under_review" | "accepted" | "rejected" }) => {
			const response = action === "withdrawn"
				? await apiClient.api.v1.internships.applications[":applicationId"].withdraw.$post({ param: { applicationId: id } })
				: await apiClient.api.v1.internships.applications[":applicationId"].status.$patch({ param: { applicationId: id }, json: { status: action } });
			if (!response.ok) throw new Error(`APPLICATION_${response.status}`);
			return response.json();
		},
		onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
	});

	return <div><div><p className="text-sm font-semibold text-primary">APPLICATIONS</p><h1 className="mt-2 text-3xl font-black">ใบสมัครฝึกงาน</h1><p className="mt-2 text-muted-foreground">{role === "student" ? "ติดตามผลและจัดการใบสมัครของคุณ" : role?.startsWith("company") || role === "supervisor" ? "ตรวจสอบผู้สมัครในตำแหน่งของบริษัท" : "ติดตามใบสมัครของนักศึกษาในมหาวิทยาลัย"}</p></div>
		{applications.isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted" />}
		{applications.isError && <Notice message="ไม่สามารถโหลดใบสมัครได้ กรุณาลองใหม่" destructive />}
		{applications.data?.data.length === 0 && <Notice message="ยังไม่มีใบสมัครในขณะนี้" />}
		<div className="mt-8 grid gap-4">{applications.data?.data.map((application) => {
			const details = application as typeof application & { internship?: { title: string }; student?: { name: string; email: string } };
			const status = application.status as ApplicationStatus;
			const actions = availableReviewActions(status, role === "company_admin");
			return <article key={application.id} className="rounded-2xl border bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf3ff] text-primary"><BriefcaseBusiness className="size-5" /></span><div><h2 className="font-bold">{details.internship?.title ?? "ตำแหน่งฝึกงาน"}</h2><p className="mt-1 text-xs text-muted-foreground">เลขที่ {application.id.slice(0, 8)}</p></div></div><StatusBadge status={status} /></div>
				<div className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">{details.student && <><span className="flex items-center gap-2"><UserRound className="size-4" />{details.student.name}</span><span className="flex items-center gap-2"><Mail className="size-4" />{details.student.email}</span></>}<span className="flex items-center gap-2"><CalendarDays className="size-4" />{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(application.submittedAt))}</span></div>
				<div className="mt-5 rounded-xl bg-muted p-4 text-sm leading-6"><span className="font-semibold">เหตุผลที่สมัคร:</span> {application.statement}</div>
				{mutation.isError && mutation.variables?.id === application.id && <p role="alert" className="mt-3 text-sm text-destructive">ดำเนินการไม่สำเร็จ สถานะอาจถูกเปลี่ยนไปแล้วหรือจำนวนรับเต็ม</p>}
				<div className="mt-5 flex flex-wrap gap-2">{role === "student" && canWithdrawApplication(status) && <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ id: application.id, action: "withdrawn" })}>ถอนใบสมัคร</Button>}{actions.map((action) => <Button key={action} variant={action === "rejected" ? "outline" : "default"} disabled={mutation.isPending} onClick={() => mutation.mutate({ id: application.id, action })}>{action === "under_review" ? "เริ่มตรวจสอบ" : action === "accepted" ? "รับเข้าฝึกงาน" : "ไม่รับ"}</Button>)}</div>
			</article>;
		})}</div></div>;
}

function StatusBadge({ status }: { status: ApplicationStatus }) { const tone = status === "accepted" ? "bg-emerald-50 text-emerald-700" : status === "rejected" || status === "withdrawn" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"; return <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{applicationStatusLabels[status]}</span>; }
function Notice({ message, destructive = false }: { message: string; destructive?: boolean }) { return <div role={destructive ? "alert" : undefined} className={`mt-8 rounded-2xl border bg-white p-10 text-center ${destructive ? "border-destructive/20 text-destructive" : "text-muted-foreground"}`}>{message}</div>; }
