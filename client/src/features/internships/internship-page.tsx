import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, CalendarDays, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { canApply, formatWorkMode } from "./internship-format";
import { CompanyInternshipPage } from "./company-internship-page";

const WORKSPACE_KEY = "trainy-workspace-id";

async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
	return response.json();
}

async function loadPublishedInternships() {
	const response = await apiClient.api.v1.internships.$get();
	if (!response.ok) throw new Error("INTERNSHIPS_FAILED");
	return response.json();
}

export function InternshipPage() {
	const queryClient = useQueryClient();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [statement, setStatement] = useState("");
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations });
	const internships = useQuery({
		queryKey: ["internships", "published"],
		queryFn: loadPublishedInternships,
	});
	const studentMembership = organizations.data?.data.find(
		(item) => item.membership.role === "student",
	);
	const activeMembership =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];

	const apply = useMutation({
		mutationFn: async (internshipId: string) => {
			if (!studentMembership) throw new Error("STUDENT_MEMBERSHIP_REQUIRED");
			const response = await apiClient.api.v1.internships[":internshipId"].applications.$post({
				param: { internshipId },
				json: { universityOrganizationId: studentMembership.organization.id, statement },
			});
			if (!response.ok) throw new Error(`APPLICATION_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setSelectedId(null);
			setStatement("");
			await queryClient.invalidateQueries({ queryKey: ["applications"] });
		},
	});

	if (
		activeMembership &&
		["company_admin", "supervisor"].includes(activeMembership.membership.role)
	) {
		return (
			<CompanyInternshipPage
				organizationId={activeMembership.organization.id}
				canManage={activeMembership.membership.role === "company_admin"}
			/>
		);
	}

	return (
		<div>
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-semibold text-primary">INTERNSHIPS</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight">ค้นหาตำแหน่งฝึกงาน</h1>
					<p className="mt-2 text-muted-foreground">
						เลือกตำแหน่งที่เหมาะกับเป้าหมายและรูปแบบการทำงานของคุณ
					</p>
				</div>
			</div>

			{internships.isLoading && (
				<div className="mt-8 grid gap-5 md:grid-cols-2">
					<Skeleton />
					<Skeleton />
				</div>
			)}
			{internships.isError && (
				<div
					role="alert"
					className="mt-8 rounded-2xl border border-destructive/20 bg-red-50 p-5 text-destructive"
				>
					ไม่สามารถโหลดตำแหน่งฝึกงานได้ กรุณาลองใหม่อีกครั้ง
				</div>
			)}
			{internships.data?.data.length === 0 && (
				<div className="mt-8 rounded-2xl border bg-white p-10 text-center">
					<BriefcaseBusiness className="mx-auto size-10 text-muted-foreground" />
					<h2 className="mt-4 font-bold">ยังไม่มีตำแหน่งที่เปิดรับ</h2>
					<p className="mt-2 text-sm text-muted-foreground">กลับมาตรวจสอบอีกครั้งในภายหลัง</p>
				</div>
			)}

			<div className="mt-8 grid gap-5 md:grid-cols-2">
				{internships.data?.data.map((internship) => {
					const open = canApply(internship.applicationDeadline);
					const selected = selectedId === internship.id;
					return (
						<article
							key={internship.id}
							className="rounded-2xl border bg-white p-6 shadow-sm shadow-slate-900/3"
						>
							<div className="flex items-start justify-between gap-4">
								<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
									<Building2 className="size-5" />
								</span>
								<span
									className={`rounded-full px-3 py-1 text-xs font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
								>
									{open ? "เปิดรับสมัคร" : "ปิดรับสมัคร"}
								</span>
							</div>
							<h2 className="mt-5 text-xl font-bold">{internship.title}</h2>
							<p className="mt-2 line-clamp-3 leading-7 text-muted-foreground">
								{internship.description}
							</p>
							<div className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
								<span className="flex items-center gap-2">
									<MapPin className="size-4" />
									{internship.location}
								</span>
								<span className="flex items-center gap-2">
									<BriefcaseBusiness className="size-4" />
									{formatWorkMode(internship.workMode)}
								</span>
								<span className="flex items-center gap-2">
									<Users className="size-4" />
									รับ {internship.capacity} คน
								</span>
								<span className="flex items-center gap-2">
									<CalendarDays className="size-4" />
									{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(
										new Date(internship.applicationDeadline),
									)}
								</span>
							</div>
							{studentMembership && open && (
								<Button
									className="mt-6 w-full"
									variant={selected ? "secondary" : "default"}
									onClick={() => setSelectedId(selected ? null : internship.id)}
								>
									{selected ? "ยกเลิก" : "สมัครตำแหน่งนี้"}
								</Button>
							)}
							{selected && (
								<form
									className="mt-4 border-t pt-4"
									onSubmit={(event) => {
										event.preventDefault();
										apply.mutate(internship.id);
									}}
								>
									<label className="text-sm font-semibold" htmlFor={`statement-${internship.id}`}>
										เหตุผลที่สนใจตำแหน่งนี้
									</label>
									<textarea
										id={`statement-${internship.id}`}
										className="mt-2 min-h-32 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
										minLength={20}
										maxLength={5000}
										required
										value={statement}
										onChange={(event) => setStatement(event.target.value)}
									/>
									<div className="mt-2 flex justify-between text-xs text-muted-foreground">
										<span>อย่างน้อย 20 ตัวอักษร</span>
										<span>{statement.length}/5000</span>
									</div>
									{apply.isError && (
										<p role="alert" className="mt-3 text-sm text-destructive">
											ส่งใบสมัครไม่สำเร็จ กรุณาตรวจสอบข้อมูลและลองใหม่
										</p>
									)}
									<Button
										className="mt-4 w-full"
										type="submit"
										disabled={statement.trim().length < 20 || apply.isPending}
									>
										{apply.isPending ? "กำลังส่ง..." : "ยืนยันการสมัคร"}
									</Button>
								</form>
							)}
						</article>
					);
				})}
			</div>
		</div>
	);
}

function Skeleton() {
	return (
		<div className="h-80 animate-pulse rounded-2xl border bg-white p-6">
			<div className="size-11 rounded-xl bg-muted" />
			<div className="mt-6 h-6 w-2/3 rounded bg-muted" />
			<div className="mt-4 h-20 rounded bg-muted" />
		</div>
	);
}
