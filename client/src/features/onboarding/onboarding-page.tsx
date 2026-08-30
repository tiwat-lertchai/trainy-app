import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Building2,
	CheckCircle2,
	Clock3,
	GraduationCap,
	ShieldCheck,
	UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import {
	facultiesEnabledForRole,
	organizationFieldKey,
	organizationTypeForRole,
	roleOptions,
	type OnboardingRole,
} from "./onboarding-rules";

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

async function loadFaculties(organizationId: string) {
	const response = await apiClient.api.v1.academic[":organizationId"].faculties.$get({
		param: { organizationId },
	});
	if (!response.ok) throw new Error("FACULTIES_FAILED");
	return response.json();
}

async function loadMajors(facultyId: string) {
	const response = await apiClient.api.v1.academic.faculties[":facultyId"].majors.$get({
		param: { facultyId },
	});
	if (!response.ok) throw new Error("MAJORS_FAILED");
	return response.json();
}

export function OnboardingPage() {
	const { t } = useLanguage();
	const queryClient = useQueryClient();
	const [role, setRole] = useState<OnboardingRole | null>(null);
	const [organizationId, setOrganizationId] = useState("");
	const [facultyId, setFacultyId] = useState("");
	const mine = useQuery({ queryKey: ["onboarding", "me"], queryFn: loadOnboarding });
	const organizations = useQuery({
		queryKey: ["onboarding", "organizations"],
		queryFn: loadAvailableOrganizations,
	});
	const effectiveRole =
		role ??
		(mine.data?.data?.status === "revision_requested"
			? (mine.data.data.requestedRole as OnboardingRole)
			: undefined);
	const facultiesEnabled =
		Boolean(organizationId) && Boolean(effectiveRole) && facultiesEnabledForRole(effectiveRole!);
	const faculties = useQuery({
		queryKey: ["academic", "faculties", organizationId],
		queryFn: () => loadFaculties(organizationId),
		enabled: facultiesEnabled,
	});
	const majors = useQuery({
		queryKey: ["academic", "majors", facultyId],
		queryFn: () => loadMajors(facultyId),
		enabled: facultiesEnabled && effectiveRole === "student" && Boolean(facultyId),
	});
	const submit = useMutation({
		mutationFn: async (
			payload: Parameters<typeof apiClient.api.v1.onboarding.$post>[0]["json"],
		) => {
			const response = await apiClient.api.v1.onboarding.$post({ json: payload });
			if (!response.ok) throw new Error(`ONBOARDING_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["onboarding"] }),
				queryClient.invalidateQueries({ queryKey: ["organizations"] }),
			]);
		},
	});

	if (mine.isLoading) return <Loading />;
	if (mine.data?.data && mine.data.data.status !== "revision_requested")
		return <RequestStatus request={mine.data.data} />;
	const revisionRequest = mine.data?.data?.status === "revision_requested" ? mine.data.data : null;
	if (!role && !revisionRequest) return <RoleSelection onSelect={setRole} />;
	const selectedRole = role ?? (revisionRequest?.requestedRole as OnboardingRole);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedRole) return;
		const data = new FormData(event.currentTarget);
		const value = (key: string) => String(data.get(key) ?? "").trim();
		const profile = { fullName: value("fullName"), email: value("email"), phone: value("phone") };
		const facultyName = faculties.data?.data.find((item) => item.id === facultyId)?.name ?? "";
		const majorName = majors.data?.data.find((item) => item.id === value("majorId"))?.name ?? "";
		let payload: Parameters<typeof apiClient.api.v1.onboarding.$post>[0]["json"];
		if (selectedRole === "student")
			payload = {
				requestedRole: selectedRole,
				targetOrganizationId: value("organizationId"),
				profile: {
					...profile,
					studentId: value("studentId"),
					faculty: facultyName,
					major: majorName,
					yearLevel: value("yearLevel"),
				},
			};
		else if (selectedRole === "advisor")
			payload = {
				requestedRole: selectedRole,
				targetOrganizationId: value("organizationId"),
				profile: {
					...profile,
					faculty: facultyName,
					department: value("department"),
					academicTitle: value("academicTitle") || undefined,
					employeeId: value("employeeId") || undefined,
				},
			};
		else if (selectedRole === "coordinator" || selectedRole === "university_admin")
			payload = {
				requestedRole: selectedRole,
				targetOrganizationId: value("organizationId"),
				profile: {
					...profile,
					department: value("department"),
					jobTitle: value("jobTitle"),
					employeeId: value("employeeId") || undefined,
				},
			};
		else if (selectedRole === "supervisor")
			payload = {
				requestedRole: selectedRole,
				targetOrganizationId: value("organizationId"),
				profile: {
					...profile,
					department: value("department"),
					jobTitle: value("jobTitle"),
					expertise: value("expertise") || undefined,
				},
			};
		else
			payload = {
				requestedRole: selectedRole,
				profile: { ...profile, department: value("department"), jobTitle: value("jobTitle") },
				organization: {
					name: value("companyName"),
					slug: value("companySlug"),
					registrationNumber: value("registrationNumber"),
					businessType: value("businessType"),
					address: value("address"),
					website: value("website") || undefined,
					email: value("companyEmail"),
					phone: value("companyPhone"),
					evidenceReference: value("evidenceReference"),
				},
			};
		submit.mutate(payload);
	}

	const targetType = organizationTypeForRole(selectedRole);
	const available = organizations.data?.data.filter((item) => item.type === targetType) ?? [];
	return (
		<div className="mx-auto max-w-3xl">
			{!revisionRequest && (
				<button
					type="button"
					className="text-sm font-medium text-primary"
					onClick={() => setRole(null)}
				>
					{t("onboarding.changeRole")}
				</button>
			)}
			<div className="mt-5 rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
				<p className="text-sm font-semibold text-primary">{t("onboarding.eyebrow")}</p>
				<h1 className="mt-2 text-3xl font-black">{t("onboarding.title")}</h1>
				<p className="mt-2 text-muted-foreground">{t("onboarding.description")}</p>
				<form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
					{revisionRequest?.reviewNote && (
						<div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 sm:col-span-2">
							{t("onboarding.revision", { note: revisionRequest.reviewNote })}
						</div>
					)}
					<Field name="fullName" label={t("onboarding.fullName")} />
					<Field name="email" label={t("onboarding.email")} type="email" />
					<Field name="phone" label={t("onboarding.phone")} />
					{targetType && (
						<label className="grid gap-2 text-sm font-semibold sm:col-span-2">
							{t(organizationFieldKey(targetType))}
							<select
								name="organizationId"
								required
								value={organizationId}
								onChange={(event) => {
									setOrganizationId(event.target.value);
									setFacultyId("");
								}}
								className="h-11 rounded-xl border bg-background px-3 font-normal"
							>
								<option value="">
									{t("onboarding.selectOrganization", {
										organization: t(organizationFieldKey(targetType)),
									})}
								</option>
								{available.map((item) => (
									<option key={item.id} value={item.id}>
										{item.name}
									</option>
								))}
							</select>
						</label>
					)}
					<RoleFields
						role={selectedRole}
						organizationId={organizationId}
						facultyId={facultyId}
						onFacultyChange={setFacultyId}
						faculties={faculties.data?.data ?? []}
						majors={majors.data?.data ?? []}
					/>
					<div className="sm:col-span-2">
						{submit.isError && (
							<p role="alert" className="mb-3 text-sm text-destructive">
								{t("onboarding.submitError")}
							</p>
						)}
						<Button className="w-full" size="lg" disabled={submit.isPending}>
							{t(
								submit.isPending
									? "onboarding.submitting"
									: selectedRole === "student"
										? "onboarding.confirmStart"
										: revisionRequest
											? "onboarding.resubmit"
											: "onboarding.submitReview",
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

function RoleSelection({ onSelect }: { onSelect: (role: OnboardingRole) => void }) {
	const { t } = useLanguage();
	return (
		<div className="mx-auto max-w-5xl">
			<div className="text-center">
				<span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf3ff] text-primary">
					<UserRoundCheck />
				</span>
				<h1 className="mt-5 text-3xl font-black">{t("onboarding.roleTitle")}</h1>
				<p className="mt-3 text-muted-foreground">{t("onboarding.roleDescription")}</p>
			</div>
			<div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{roleOptions.map((option) => (
					<button
						type="button"
						key={option.value}
						onClick={() => onSelect(option.value)}
						className="rounded-2xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
					>
						<span className="grid size-10 place-items-center rounded-xl bg-[#edf3ff] text-primary">
							{option.value === "student" ? (
								<GraduationCap />
							) : option.value.includes("company") || option.value === "supervisor" ? (
								<Building2 />
							) : (
								<ShieldCheck />
							)}
						</span>
						<span className="mt-4 block font-bold">{t(option.labelKey)}</span>
						<span className="mt-2 block text-sm leading-6 text-muted-foreground">
							{t(option.descriptionKey)}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

type FacultyOption = { id: string; name: string };

function RoleFields({
	role,
	organizationId,
	facultyId,
	onFacultyChange,
	faculties,
	majors,
}: {
	role: OnboardingRole;
	organizationId: string;
	facultyId: string;
	onFacultyChange: (id: string) => void;
	faculties: FacultyOption[];
	majors: FacultyOption[];
}) {
	const { t } = useLanguage();
	const facultySelect = (
		<label className="grid gap-2 text-sm font-semibold">
			{t("onboarding.faculty")}
			<select
				name="facultyId"
				required
				value={facultyId}
				onChange={(event) => onFacultyChange(event.target.value)}
				disabled={!organizationId}
				className="h-11 rounded-xl border bg-background px-3 font-normal disabled:opacity-50"
			>
				<option value="">
					{t(organizationId ? "onboarding.selectFaculty" : "onboarding.selectUniversityFirst")}
				</option>
				{faculties.map((item) => (
					<option key={item.id} value={item.id}>
						{item.name}
					</option>
				))}
			</select>
		</label>
	);
	if (role === "student")
		return (
			<>
				<Field name="studentId" label={t("onboarding.studentId")} />
				<label className="grid gap-2 text-sm font-semibold">
					{t("onboarding.yearLevel")}
					<select
						name="yearLevel"
						required
						defaultValue=""
						className="h-11 rounded-xl border bg-background px-3 font-normal"
					>
						<option value="" disabled>
							{t("onboarding.selectYear")}
						</option>
						{["1", "2", "3", "4", "5", "6"].map((year) => (
							<option key={year} value={year}>
								{t("onboarding.year", { year })}
							</option>
						))}
					</select>
				</label>
				{facultySelect}
				<label className="grid gap-2 text-sm font-semibold">
					{t("onboarding.major")}
					<select
						name="majorId"
						required
						disabled={!facultyId}
						className="h-11 rounded-xl border bg-background px-3 font-normal disabled:opacity-50"
					>
						<option value="">
							{t(facultyId ? "onboarding.selectMajor" : "onboarding.selectFacultyFirst")}
						</option>
						{majors.map((item) => (
							<option key={item.id} value={item.id}>
								{item.name}
							</option>
						))}
					</select>
				</label>
			</>
		);
	if (role === "advisor")
		return (
			<>
				{facultySelect}
				<Field name="department" label={t("onboarding.academicDepartment")} />
				<Field name="academicTitle" label={t("onboarding.academicTitle")} required={false} />
				<Field name="employeeId" label={t("onboarding.employeeIdOptional")} required={false} />
			</>
		);
	if (role === "company_admin")
		return (
			<>
				<Field name="department" label={t("onboarding.applicantDepartment")} />
				<Field name="jobTitle" label={t("onboarding.applicantJobTitle")} />
				<Field name="companyName" label={t("onboarding.companyName")} />
				<Field
					name="companySlug"
					label={t("onboarding.companySlug")}
					pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
				/>
				<Field name="registrationNumber" label={t("onboarding.registrationNumber")} />
				<Field name="businessType" label={t("onboarding.businessType")} />
				<Field name="companyEmail" label={t("onboarding.companyEmail")} type="email" />
				<Field name="companyPhone" label={t("onboarding.companyPhone")} />
				<Field name="website" label={t("onboarding.websiteOptional")} type="url" required={false} />
				<Field name="evidenceReference" label={t("onboarding.evidenceReference")} />
				<label className="grid gap-2 text-sm font-semibold sm:col-span-2">
					{t("onboarding.companyAddress")}
					<textarea
						name="address"
						required
						minLength={10}
						className="min-h-24 rounded-xl border bg-background p-3 font-normal"
					/>
				</label>
			</>
		);
	return (
		<>
			<Field name="department" label={t("onboarding.department")} />
			<Field name="jobTitle" label={t("onboarding.jobTitle")} />
			{role !== "supervisor" && (
				<Field name="employeeId" label={t("onboarding.employeeIdOptional")} required={false} />
			)}
			{role === "supervisor" && (
				<Field name="expertise" label={t("onboarding.expertiseOptional")} required={false} />
			)}
		</>
	);
}

function Field({
	name,
	label,
	required = true,
	...props
}: {
	name: string;
	label: string;
	required?: boolean;
	type?: string;
	pattern?: string;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<input
				name={name}
				required={required}
				minLength={required ? 2 : undefined}
				className="h-11 rounded-xl border bg-background px-3 font-normal outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
				{...props}
			/>
		</label>
	);
}
function Loading() {
	const { t } = useLanguage();
	return (
		<div className="grid min-h-80 place-items-center text-muted-foreground">
			{t("onboarding.loading")}
		</div>
	);
}
function RequestStatus({
	request,
}: {
	request: { status: string; requestedRole: string; reviewNote?: string | null };
}) {
	const { t } = useLanguage();
	const approved = request.status === "approved";
	return (
		<div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center">
			<span
				className={`mx-auto grid size-14 place-items-center rounded-2xl ${approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
			>
				{approved ? <CheckCircle2 /> : <Clock3 />}
			</span>
			<h1 className="mt-5 text-2xl font-black">
				{t(
					approved
						? "onboarding.status.approved"
						: request.status === "revision_requested"
							? "onboarding.status.revision"
							: request.status === "rejected"
								? "onboarding.status.rejected"
								: "onboarding.status.pending",
				)}
			</h1>
			<p className="mt-3 text-muted-foreground">
				{t("onboarding.requestedRole", {
					role: t(
						roleOptions.find((item) => item.value === request.requestedRole)?.labelKey ??
							"onboarding.role.student",
					),
				})}
			</p>
			{request.reviewNote && (
				<div className="mt-5 rounded-xl bg-muted p-4 text-left text-sm">
					{t("onboarding.note", { note: request.reviewNote })}
				</div>
			)}
		</div>
	);
}
