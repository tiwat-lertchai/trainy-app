import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CalendarDays, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { availablePlacementActions, type PlacementStatus } from "./placement-rules";

const WORKSPACE_KEY = "trainy-workspace-id";
const universityManagers = ["university_admin", "coordinator"];

export function PlacementPage() {
	const { locale, t } = useLanguage();
	const queryClient = useQueryClient();
	const [confirmation, setConfirmation] = useState<{
		placementId: string;
		status: "completed" | "cancelled";
	} | null>(null);
	const organizations = useQuery({
		queryKey: ["organizations"],
		queryFn: async () => {
			const response = await apiClient.api.v1.organizations.$get();
			if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
			return response.json();
		},
	});
	const contexts = organizations.data?.data ?? [];
	const context =
		contexts.find((item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY)) ??
		contexts[0];
	const organizationId = context?.organization.id;
	const role = context?.membership.role as OrganizationRole | undefined;
	const isStudent = role === "student";
	const placements = useQuery({
		queryKey: ["placements", isStudent ? "me" : organizationId],
		queryFn: async () => {
			const response = isStudent
				? await apiClient.api.v1.placements.me.$get()
				: await apiClient.api.v1.placements.organizations[":organizationId"].$get({
						param: { organizationId: organizationId! },
					});
			if (!response.ok) throw new Error("PLACEMENTS_FAILED");
			return response.json();
		},
		enabled: Boolean(role && (isStudent || organizationId)),
	});
	const members = useQuery({
		queryKey: ["organizations", organizationId, "members"],
		queryFn: async () => {
			const response = await apiClient.api.v1.organizations[":organizationId"].members.$get({
				param: { organizationId: organizationId! },
			});
			if (!response.ok) throw new Error("MEMBERS_FAILED");
			return response.json();
		},
		enabled: Boolean(organizationId && !isStudent),
	});
	const accepted = useQuery({
		queryKey: ["applications", "accepted", organizationId],
		queryFn: async () => {
			const response = await apiClient.api.v1.internships.universities[
				":organizationId"
			].applications.$get({ param: { organizationId: organizationId! } });
			if (!response.ok) throw new Error("APPLICATIONS_FAILED");
			return response.json();
		},
		enabled: Boolean(organizationId && universityManagers.includes(role ?? "")),
	});
	const mutate = useMutation({
		mutationFn: async (
			input:
				| { kind: "create"; applicationId: string; startDate: string; endDate: string }
				| { kind: "advisor"; placementId: string; userId: string }
				| { kind: "supervisor"; placementId: string; userId: string }
				| { kind: "status"; placementId: string; status: "active" | "completed" | "cancelled" },
		) => {
			if (input.kind === "create") {
				const response = await apiClient.api.v1.placements.$post({
					json: {
						applicationId: input.applicationId,
						startDate: new Date(input.startDate).toISOString(),
						endDate: new Date(input.endDate).toISOString(),
					},
				});
				if (!response.ok) throw new Error(`PLACEMENT_${response.status}`);
				return response.json();
			}
			if (input.kind === "advisor") {
				const response = await apiClient.api.v1.placements[":placementId"].advisor.$patch({
					param: { placementId: input.placementId },
					json: { advisorUserId: input.userId },
				});
				if (!response.ok) throw new Error(`PLACEMENT_${response.status}`);
				return response.json();
			}
			if (input.kind === "supervisor") {
				const response = await apiClient.api.v1.placements[":placementId"].supervisor.$patch({
					param: { placementId: input.placementId },
					json: { supervisorUserId: input.userId },
				});
				if (!response.ok) throw new Error(`PLACEMENT_${response.status}`);
				return response.json();
			}
			const response = await apiClient.api.v1.placements[":placementId"].status.$patch({
				param: { placementId: input.placementId },
				json: { status: input.status },
			});
			if (!response.ok) throw new Error(`PLACEMENT_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setConfirmation(null);
			await queryClient.invalidateQueries({ queryKey: ["placements"] });
		},
	});
	const acceptedItems = accepted.data?.data.filter((item) => item.status === "accepted") ?? [];
	const memberItems = (members.data?.data ?? []).map(
		(item) => item as typeof item & { user?: { id: string; name: string; email: string } },
	);

	return (
		<div>
			<div>
				<p className="text-sm font-semibold text-primary">{t("placements.eyebrow")}</p>
				<h1 className="mt-2 text-3xl font-black">{t("placements.title")}</h1>
				<p className="mt-2 text-muted-foreground">{t("placements.description")}</p>
			</div>
			{universityManagers.includes(role ?? "") && acceptedItems.length > 0 && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">{t("placements.createHeading")}</h2>
					<div className="mt-4 grid gap-3">
						{acceptedItems.map((application) => (
							<form
								key={application.id}
								className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-[1fr_160px_160px_auto] sm:items-end"
								onSubmit={(event) => {
									event.preventDefault();
									const data = new FormData(event.currentTarget);
									mutate.mutate({
										kind: "create",
										applicationId: application.id,
										startDate: String(data.get("startDate")),
										endDate: String(data.get("endDate")),
									});
								}}
							>
								<div>
									<p className="font-semibold">
										{(
											application as typeof application & {
												internship?: { title: string };
												student?: { name: string };
											}
										).internship?.title ?? application.id.slice(0, 8)}
									</p>
									<p className="text-sm text-muted-foreground">
										{(application as typeof application & { student?: { name: string } }).student
											?.name ?? t("placements.student")}
									</p>
								</div>
								<DateField name="startDate" label={t("placements.startDate")} />
								<DateField name="endDate" label={t("placements.endDate")} />
								<Button disabled={mutate.isPending}>{t("placements.create")}</Button>
							</form>
						))}
					</div>
				</section>
			)}
			{placements.isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted" />}
			{placements.isError && (
				<div
					role="alert"
					className="mt-8 rounded-2xl border border-destructive/20 bg-white p-6 text-destructive"
				>
					{t("placements.loadError")}
				</div>
			)}
			{placements.data?.data.length === 0 && (
				<div className="mt-8 rounded-2xl border bg-white p-10 text-center text-muted-foreground">
					{t("placements.empty")}
				</div>
			)}
			<div className="mt-8 grid gap-5">
				{placements.data?.data.map((placement) => {
					const view = placement as typeof placement & {
						internship?: { title: string };
						student?: { name: string };
						advisor?: { name: string } | null;
						supervisor?: { name: string } | null;
					};
					const status = placement.status as PlacementStatus;
					const canManageStatus = universityManagers.includes(role ?? "");
					return (
						<article key={placement.id} className="rounded-2xl border bg-white p-6">
							<div className="flex flex-col justify-between gap-3 sm:flex-row">
								<div className="flex gap-3">
									<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
										<BriefcaseBusiness />
									</span>
									<div>
										<h2 className="font-bold">
											{view.internship?.title ?? t("placements.fallbackTitle")}
										</h2>
										<p className="mt-1 text-sm text-muted-foreground">
											{view.student?.name ??
												(isStudent ? t("placements.mine") : placement.studentUserId)}
										</p>
									</div>
								</div>
								<Badge status={status} />
							</div>
							<div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
								<Info
									icon={CalendarDays}
									label={t("placements.duration")}
									value={`${formatDate(placement.startDate, locale)} – ${formatDate(placement.endDate, locale)}`}
								/>
								<Info
									icon={UserRound}
									label={t("placements.advisor")}
									value={view.advisor?.name ?? t("placements.unassigned")}
								/>
								<Info
									icon={UserRound}
									label={t("placements.supervisor")}
									value={view.supervisor?.name ?? t("placements.unassigned")}
								/>
							</div>
							{(status === "pending" && role === "university_admin") ||
							(status === "pending" && role === "coordinator") ? (
								<Assignment
									placementId={placement.id}
									members={memberItems.filter(
										(item) => item.role === "advisor" && item.status === "active",
									)}
									pending={mutate.isPending}
									label={t("placements.selectAdvisor")}
									onAssign={(userId) =>
										mutate.mutate({ kind: "advisor", placementId: placement.id, userId })
									}
								/>
							) : null}
							{status === "pending" && role === "company_admin" && (
								<Assignment
									placementId={placement.id}
									members={memberItems.filter(
										(item) => item.role === "supervisor" && item.status === "active",
									)}
									pending={mutate.isPending}
									label={t("placements.selectSupervisor")}
									onAssign={(userId) =>
										mutate.mutate({ kind: "supervisor", placementId: placement.id, userId })
									}
								/>
							)}
							<div className="mt-5 flex gap-2">
								{availablePlacementActions(
									status,
									Boolean(placement.advisorUserId && placement.supervisorUserId),
									canManageStatus,
								).map((next) => (
									<Button
										key={next}
										variant={next === "cancelled" ? "outline" : "default"}
										disabled={mutate.isPending}
										onClick={() =>
											next === "active"
												? mutate.mutate({ kind: "status", placementId: placement.id, status: next })
												: setConfirmation({ placementId: placement.id, status: next })
										}
									>
										{next === "active"
											? t("placements.start")
											: next === "completed"
												? t("placements.complete")
												: t("placements.cancel")}
									</Button>
								))}
							</div>
							{mutate.isError && (
								<p role="alert" className="mt-3 text-sm text-destructive">
									{t("placements.actionError")}
								</p>
							)}
						</article>
					);
				})}
			</div>
			<ConfirmationDialog
				open={Boolean(confirmation)}
				title={t("confirm.terminalTitle")}
				description={t("confirm.irreversible")}
				confirmLabel={t("common.confirm")}
				cancelLabel={t("common.cancel")}
				destructive={confirmation?.status === "cancelled"}
				pending={mutate.isPending}
				onCancel={() => setConfirmation(null)}
				onConfirm={() => confirmation && mutate.mutate({ kind: "status", ...confirmation })}
			/>
		</div>
	);
}

function Assignment({
	members,
	pending,
	label,
	onAssign,
}: {
	placementId: string;
	members: Array<{ userId: string; user?: { name: string } }>;
	pending: boolean;
	label: string;
	onAssign: (id: string) => void;
}) {
	return (
		<div className="mt-5 flex flex-col gap-2 rounded-xl bg-muted p-4 sm:flex-row">
			<select
				className="h-10 flex-1 rounded-lg border bg-white px-3 text-sm"
				defaultValue=""
				onChange={(event) => event.target.value && onAssign(event.target.value)}
				disabled={pending}
			>
				<option value="">{label}</option>
				{members.map((member) => (
					<option key={member.userId} value={member.userId}>
						{member.user?.name ?? member.userId}
					</option>
				))}
			</select>
		</div>
	);
}
function DateField({ name, label }: { name: string; label: string }) {
	return (
		<label className="grid gap-1 text-xs font-semibold">
			{label}
			<input
				type="date"
				name={name}
				required
				className="h-10 rounded-lg border bg-white px-3 text-sm font-normal"
			/>
		</label>
	);
}
function Info({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof CalendarDays;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-xl bg-muted p-4">
			<span className="flex items-center gap-2 text-xs text-muted-foreground">
				<Icon className="size-4" />
				{label}
			</span>
			<p className="mt-2 font-semibold">{value}</p>
		</div>
	);
}
function Badge({ status }: { status: PlacementStatus }) {
	const { t } = useLanguage();
	return (
		<span
			className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
		>
			{t(`status.${status}`)}
		</span>
	);
}
function formatDate(value: string | Date, locale: string) {
	return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}
