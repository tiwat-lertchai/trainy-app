import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, CalendarDays, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import { canApply, workModeKeys } from "./internship-format";
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
	const { locale, t } = useLanguage();
	const queryClient = useQueryClient();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [statement, setStatement] = useState("");
	const [semester, setSemester] = useState(1);
	const [academicYear, setAcademicYear] = useState(2569);
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
				json: {
					universityOrganizationId: studentMembership.organization.id,
					semester,
					academicYear,
					statement,
				},
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
					<p className="text-sm font-semibold text-primary">{t("internships.eyebrow")}</p>
					<h1 className="mt-2 text-3xl font-black tracking-tight">{t("internships.title")}</h1>
					<p className="mt-2 text-muted-foreground">{t("internships.description")}</p>
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
					{t("internships.loadError")}
				</div>
			)}
			{internships.data?.data.length === 0 && (
				<div className="mt-8 rounded-2xl border bg-white p-10 text-center">
					<BriefcaseBusiness className="mx-auto size-10 text-muted-foreground" />
					<h2 className="mt-4 font-bold">{t("internships.emptyTitle")}</h2>
					<p className="mt-2 text-sm text-muted-foreground">{t("internships.emptyDetail")}</p>
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
									{t(open ? "internships.open" : "internships.closed")}
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
									{t(workModeKeys[internship.workMode])}
								</span>
								<span className="flex items-center gap-2">
									<Users className="size-4" />
									{t("internships.capacity", { count: internship.capacity })}
								</span>
								<span className="flex items-center gap-2">
									<CalendarDays className="size-4" />
									{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
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
									{t(selected ? "internships.cancelApplication" : "internships.apply")}
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
										{t("internships.statement")}
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
									<div className="mt-3 grid grid-cols-2 gap-3">
										<label className="grid gap-1 text-sm font-semibold">
											{t("internshipRequests.semester")}
											<select
												className="h-10 rounded-xl border px-3"
												value={semester}
												onChange={(event) => setSemester(Number(event.target.value))}
											>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
											</select>
										</label>
										<label className="grid gap-1 text-sm font-semibold">
											{t("internshipRequests.academicYear")}
											<input
												className="h-10 rounded-xl border px-3"
												type="number"
												min="2400"
												max="2800"
												value={academicYear}
												onChange={(event) => setAcademicYear(Number(event.target.value))}
											/>
										</label>
									</div>
									<div className="mt-2 flex justify-between text-xs text-muted-foreground">
										<span>{t("internships.statementMinimum")}</span>
										<span>{statement.length}/5000</span>
									</div>
									{apply.isError && (
										<p role="alert" className="mt-3 text-sm text-destructive">
											{t("internships.applyError")}
										</p>
									)}
									<Button
										className="mt-4 w-full"
										type="submit"
										disabled={statement.trim().length < 20 || apply.isPending}
									>
										{t(apply.isPending ? "internships.applying" : "internships.confirmApplication")}
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
