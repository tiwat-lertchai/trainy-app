import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";

const WORKSPACE_KEY = "trainy-workspace-id";

export function AcademicAdminPage() {
	const queryClient = useQueryClient();
	const { t } = useLanguage();
	const [openFacultyId, setOpenFacultyId] = useState("");

	const organizations = useQuery({
		queryKey: ["organizations"],
		queryFn: async () => {
			const r = await apiClient.api.v1.organizations.$get();
			if (!r.ok) throw new Error();
			return r.json();
		},
	});
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const organizationId = context?.organization.id;
	const role = context?.membership.role;
	const canManageStructure = role === "university_admin";
	const canManageRecords = role === "university_admin" || role === "coordinator";
	const members = useQuery({
		queryKey: ["organizations", organizationId, "members"],
		queryFn: async () => {
			const r = await apiClient.api.v1.organizations[":organizationId"].members.$get({
				param: { organizationId: organizationId! },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(organizationId && canManageRecords),
	});

	const faculties = useQuery({
		queryKey: ["academic", "faculties", organizationId],
		queryFn: async () => {
			const r = await apiClient.api.v1.academic[":organizationId"].faculties.$get({
				param: { organizationId: organizationId! },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(organizationId),
	});
	const majors = useQuery({
		queryKey: ["academic", "majors", openFacultyId],
		queryFn: async () => {
			const r = await apiClient.api.v1.academic.faculties[":facultyId"].majors.$get({
				param: { facultyId: openFacultyId },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(openFacultyId),
	});

	const addFaculty = useMutation({
		mutationFn: async (name: string) => {
			const r = await apiClient.api.v1.academic[":organizationId"].faculties.$post({
				param: { organizationId: organizationId! },
				json: { name },
			});
			if (!r.ok) throw new Error(`FACULTY_${r.status}`);
			return r.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["academic", "faculties", organizationId] }),
	});
	const addMajor = useMutation({
		mutationFn: async ({ facultyId, name }: { facultyId: string; name: string }) => {
			const r = await apiClient.api.v1.academic.faculties[":facultyId"].majors.$post({
				param: { facultyId },
				json: { name },
			});
			if (!r.ok) throw new Error(`MAJOR_${r.status}`);
			return r.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["academic", "majors", openFacultyId] }),
	});
	const setProgramChair = useMutation({
		mutationFn: async ({ majorId, userId }: { majorId: string; userId: string }) => {
			const r = await apiClient.api.v1.academic.majors[":majorId"]["program-chair"].$patch({
				param: { majorId },
				json: { userId },
			});
			if (!r.ok) throw new Error(`PROGRAM_CHAIR_${r.status}`);
			return r.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["academic", "majors", openFacultyId] }),
	});
	const setAcademicRecord = useMutation({
		mutationFn: async ({
			studentUserId,
			cumulativeGpa,
			lastTermGpa,
			meetsPrerequisite,
		}: {
			studentUserId: string;
			cumulativeGpa?: number;
			lastTermGpa?: number;
			meetsPrerequisite: boolean;
		}) => {
			const r = await apiClient.api.v1.academic[":organizationId"].students[
				":studentUserId"
			].record.$put({
				param: { organizationId: organizationId!, studentUserId },
				json: { cumulativeGpa, lastTermGpa, meetsPrerequisite },
			});
			if (!r.ok) throw new Error(`ACADEMIC_RECORD_${r.status}`);
			return r.json();
		},
	});

	function submitFaculty(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = String(new FormData(form).get("name") ?? "").trim();
		if (name) addFaculty.mutate(name, { onSuccess: () => form.reset() });
	}

	function submitMajor(event: FormEvent<HTMLFormElement>, facultyId: string) {
		event.preventDefault();
		const form = event.currentTarget;
		const name = String(new FormData(form).get("name") ?? "").trim();
		if (name) addMajor.mutate({ facultyId, name }, { onSuccess: () => form.reset() });
	}

	if (organizations.isLoading)
		return (
			<div className="grid min-h-80 place-items-center text-muted-foreground">
				{t("academic.loading")}
			</div>
		);
	if (!canManageRecords)
		return (
			<div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center text-muted-foreground">
				{t("academic.forbidden")}
			</div>
		);

	return (
		<div>
			<p className="text-sm font-semibold text-primary">{t("academic.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("academic.title")}</h1>
			<p className="mt-2 text-muted-foreground">
				{t("academic.description", { organization: context?.organization.name ?? "" })}
			</p>

			{canManageStructure && (
				<form className="mt-6 flex max-w-md gap-2" onSubmit={submitFaculty}>
					<input
						name="name"
						placeholder={t("academic.facultyPlaceholder")}
						required
						minLength={2}
						maxLength={200}
						className="h-11 flex-1 rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
					/>
					<Button disabled={addFaculty.isPending}>{t("academic.addFaculty")}</Button>
				</form>
			)}
			{addFaculty.isError && (
				<p role="alert" className="mt-2 text-sm text-destructive">
					{t("academic.addFacultyError")}
				</p>
			)}

			{faculties.isLoading && <div className="mt-8 h-32 animate-pulse rounded-2xl bg-muted" />}
			{faculties.data?.data.length === 0 && (
				<div className="mt-8 rounded-2xl border bg-white p-10 text-center text-muted-foreground">
					{t("academic.noFaculties")}
				</div>
			)}

			<div className="mt-6 grid gap-4">
				{faculties.data?.data.map((faculty) => {
					const open = openFacultyId === faculty.id;
					return (
						<article key={faculty.id} className="rounded-2xl border bg-white p-6">
							<button
								type="button"
								className="flex w-full items-center gap-3 text-left"
								onClick={() => setOpenFacultyId(open ? "" : faculty.id)}
							>
								<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
									<GraduationCap />
								</span>
								<span className="font-bold">{faculty.name}</span>
							</button>
							{open && (
								<div className="mt-5 border-t pt-5">
									{canManageStructure && (
										<form
											className="flex max-w-md gap-2"
											onSubmit={(event) => submitMajor(event, faculty.id)}
										>
											<input
												name="name"
												placeholder={t("academic.majorPlaceholder")}
												required
												minLength={2}
												maxLength={200}
												className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
											/>
											<Button size="sm" disabled={addMajor.isPending}>
												{t("academic.addMajor")}
											</Button>
										</form>
									)}
									{addMajor.isError && (
										<p role="alert" className="mt-2 text-sm text-destructive">
											{t("academic.addMajorError")}
										</p>
									)}
									<ul className="mt-4 flex flex-wrap gap-2">
										{majors.data?.data.map((major) => (
											<li
												key={major.id}
												className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm"
											>
												<span className="font-semibold">{major.name}</span>
												<select
													aria-label={t("academic.programChairAria", { major: major.name })}
													className="h-9 rounded-lg border bg-white px-2"
													value={major.programChairUserId ?? ""}
													disabled={!canManageStructure || setProgramChair.isPending}
													onChange={(event) =>
														setProgramChair.mutate({
															majorId: major.id,
															userId: event.target.value,
														})
													}
												>
													<option value="">{t("academic.selectProgramChair")}</option>
													{members.data?.data
														.filter(
															(member) => member.role === "advisor" && member.status === "active",
														)
														.map((member) => {
															const view = member as typeof member & { user?: { name: string } };
															return (
																<option key={member.id} value={member.userId}>
																	{view.user?.name ?? member.userId}
																</option>
															);
														})}
												</select>
											</li>
										))}
										{majors.data?.data.length === 0 && (
											<li className="text-sm text-muted-foreground">{t("academic.noMajors")}</li>
										)}
									</ul>
								</div>
							)}
						</article>
					);
				})}
			</div>

			<section className="mt-10 border-t pt-8">
				<h2 className="text-xl font-black">{t("academic.studentRecords")}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{t("academic.studentRecordsDetail")}</p>
				<div className="mt-5 grid gap-3">
					{members.data?.data
						.filter((member) => member.role === "student" && member.status === "active")
						.map((member) => {
							const view = member as typeof member & { user?: { name: string; email: string } };
							return (
								<AcademicRecordForm
									key={member.id}
									userId={member.userId}
									name={view.user?.name ?? member.userId}
									pending={setAcademicRecord.isPending}
									onSave={(values) =>
										setAcademicRecord.mutate({ studentUserId: member.userId, ...values })
									}
								/>
							);
						})}
				</div>
				{setAcademicRecord.isError && (
					<p role="alert" className="mt-3 text-sm text-destructive">
						{t("academic.studentRecordsError")}
					</p>
				)}
			</section>
		</div>
	);
}

function AcademicRecordForm({
	userId,
	name,
	pending,
	onSave,
}: {
	userId: string;
	name: string;
	pending: boolean;
	onSave: (values: {
		cumulativeGpa?: number;
		lastTermGpa?: number;
		meetsPrerequisite: boolean;
	}) => void;
}) {
	const { t } = useLanguage();
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const cumulative = String(data.get("cumulativeGpa") ?? "");
		const lastTerm = String(data.get("lastTermGpa") ?? "");
		onSave({
			cumulativeGpa: cumulative ? Number(cumulative) : undefined,
			lastTermGpa: lastTerm ? Number(lastTerm) : undefined,
			meetsPrerequisite: data.get("meetsPrerequisite") === "on",
		});
	}
	return (
		<form
			className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_120px_120px_auto_auto] sm:items-end"
			onSubmit={submit}
		>
			<div>
				<p className="font-bold">{name}</p>
				<p className="text-xs text-muted-foreground">{userId}</p>
			</div>
			<label className="grid gap-1 text-xs font-semibold">
				{t("academic.cumulativeGpa")}
				<input
					name="cumulativeGpa"
					type="number"
					min="0"
					max="4"
					step="0.01"
					className="h-10 rounded-lg border px-2 text-sm"
				/>
			</label>
			<label className="grid gap-1 text-xs font-semibold">
				{t("academic.latestGpa")}
				<input
					name="lastTermGpa"
					type="number"
					min="0"
					max="4"
					step="0.01"
					className="h-10 rounded-lg border px-2 text-sm"
				/>
			</label>
			<label className="flex h-10 items-center gap-2 text-sm">
				<input name="meetsPrerequisite" type="checkbox" /> {t("academic.meetsPrerequisite")}
			</label>
			<Button size="sm" disabled={pending}>
				{t("academic.save")}
			</Button>
		</form>
	);
}
