import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, CalendarCheck, ClipboardList, Pencil, Send, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { canEditCwie, canManageCwieVisits, canReviewCwie } from "./cwie-rules";

const WORKSPACE_KEY = "trainy-workspace-id";
type Tab = "entries" | "visits" | "summaries";
type EntryType = "daily_log" | "weekly_plan" | "experience";

export function CwiePage() {
	const { t } = useLanguage();
	const queryClient = useQueryClient();
	const session = authClient.useSession();
	const [tab, setTab] = useState<Tab>("entries");
	const [selectedPlacement, setSelectedPlacement] = useState("");
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations });
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const role = context?.membership.role as OrganizationRole | undefined;
	const isStudent = role === "student";
	const placements = useQuery({
		queryKey: ["placements", isStudent ? "me" : context?.organization.id],
		queryFn: async () => {
			const response = isStudent
				? await apiClient.api.v1.placements.me.$get()
				: await apiClient.api.v1.placements.organizations[":organizationId"].$get({
						param: { organizationId: context!.organization.id },
					});
			if (!response.ok) throw new Error("PLACEMENTS_FAILED");
			return response.json();
		},
		enabled: Boolean(context),
	});
	const availablePlacements =
		placements.data?.data.filter((placement) => {
			if (role === "advisor") return placement.advisorUserId === session.data?.user.id;
			if (role === "supervisor") return placement.supervisorUserId === session.data?.user.id;
			return role === "student";
		}) ?? [];
	const placementId = selectedPlacement || availablePlacements[0]?.id || "";
	const workspace = useQuery({
		queryKey: ["cwie", placementId],
		queryFn: async () => {
			const response = await apiClient.api.v1.cwie.placements[":placementId"].$get({
				param: { placementId },
			});
			if (!response.ok) throw new Error(`CWIE_${response.status}`);
			return response.json();
		},
		enabled: Boolean(placementId),
	});
	const refresh = async () => queryClient.invalidateQueries({ queryKey: ["cwie", placementId] });

	return (
		<div className="space-y-6">
			<div>
				<p className="text-sm font-semibold text-primary">{t("cwie.eyebrow")}</p>
				<h1 className="mt-2 text-3xl font-black">{t("cwie.title")}</h1>
				<p className="mt-2 max-w-3xl text-muted-foreground">{t("cwie.description")}</p>
			</div>
			<label className="grid max-w-xl gap-2 text-sm font-semibold">
				{t("cwie.placement")}
				<select
					className="h-11 rounded-xl border bg-card px-3"
					value={placementId}
					onChange={(event) => setSelectedPlacement(event.target.value)}
				>
					{availablePlacements.map((placement) => (
						<option key={placement.id} value={placement.id}>
							{placement.student?.name ?? placement.internship?.title ?? placement.id.slice(0, 8)}
						</option>
					))}
				</select>
			</label>
			{placements.isSuccess && availablePlacements.length === 0 && (
				<Notice text={t("cwie.noPlacements")} />
			)}
			<div className="flex flex-wrap gap-2 border-b pb-3">
				<TabButton active={tab === "entries"} onClick={() => setTab("entries")}>
					<ClipboardList /> {t("cwie.entries")}
				</TabButton>
				<TabButton active={tab === "visits"} onClick={() => setTab("visits")}>
					<CalendarCheck /> {t("cwie.visits")}
				</TabButton>
				<TabButton active={tab === "summaries"} onClick={() => setTab("summaries")}>
					<Stamp /> {t("cwie.summaries")}
				</TabButton>
			</div>
			{workspace.isLoading && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}
			{workspace.isError && <Notice text={t("cwie.loadError")} error />}
			{workspace.data && tab === "entries" && (
				<EntrySection
					placementId={placementId}
					role={role}
					entries={workspace.data.data.entries}
					onChanged={refresh}
				/>
			)}
			{workspace.data && tab === "visits" && (
				<VisitSection
					placementId={placementId}
					role={role}
					visits={workspace.data.data.visits}
					onChanged={refresh}
				/>
			)}
			{workspace.data && tab === "summaries" && (
				<SummarySection
					placementId={placementId}
					role={role}
					summaries={workspace.data.data.monthlySummaries}
					onChanged={refresh}
				/>
			)}
		</div>
	);
}

type WorkspaceData = NonNullable<
	Awaited<ReturnType<(typeof apiClient.api.v1.cwie.placements)[":placementId"]["$get"]>>
>;
type WorkspaceJson = Awaited<ReturnType<WorkspaceData["json"]>>;
type WorkspaceSuccess = Extract<WorkspaceJson, { data: unknown }>;
type WorkspacePayload = NonNullable<WorkspaceSuccess["data"]>;
type Entry = WorkspacePayload["entries"][number];
type Visit = WorkspacePayload["visits"][number];
type Summary = WorkspacePayload["monthlySummaries"][number];

function EntrySection({
	placementId,
	role,
	entries,
	onChanged,
}: {
	placementId: string;
	role?: OrganizationRole;
	entries: Entry[];
	onChanged: () => Promise<unknown>;
}) {
	const { t } = useLanguage();
	const [editing, setEditing] = useState<Entry>();
	const action = useMutation({
		mutationFn: async (
			input: { kind: "save"; data: EntryPayload; id?: string } | { kind: "submit"; id: string },
		) => {
			const response =
				input.kind === "submit"
					? await apiClient.api.v1.cwie.entries[":entryId"].submit.$post({
							param: { entryId: input.id },
						})
					: input.id
						? await apiClient.api.v1.cwie.entries[":entryId"].$put({
								param: { entryId: input.id },
								json: input.data,
							})
						: await apiClient.api.v1.cwie.entries.$post({ json: input.data });
			if (!response.ok) throw new Error(`CWIE_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setEditing(undefined);
			await onChanged();
		},
	});
	return (
		<section className="space-y-5">
			{role === "student" && (
				<EntryForm
					placementId={placementId}
					entry={editing}
					pending={action.isPending}
					onCancel={() => setEditing(undefined)}
					onSave={(data) => action.mutate({ kind: "save", data, id: editing?.id })}
				/>
			)}
			{entries.length === 0 && <Notice text={t("cwie.entriesEmpty")} />}
			<div className="grid gap-4">
				{entries.map((entry) => (
					<article key={entry.id} className="rounded-2xl border bg-card p-6">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="font-bold">{t(cwieKey("type", entry.type))}</p>
								<p className="text-sm text-muted-foreground">
									{entry.workDate ?? `${entry.periodStart} – ${entry.periodEnd}`}
								</p>
							</div>
							<Status value={entry.status} />
						</div>
						<EntryDetails entry={entry} />
						<ReviewSummary record={entry} />
						<div className="mt-5 flex flex-wrap gap-2">
							{canEditCwie(entry.status, role) && (
								<>
									<Button variant="outline" onClick={() => setEditing(entry)}>
										<Pencil /> {t("common.edit")}
									</Button>
									<Button
										disabled={action.isPending}
										onClick={() => action.mutate({ kind: "submit", id: entry.id })}
									>
										<Send /> {t("cwie.submit")}
									</Button>
								</>
							)}
						</div>
						{canReviewCwie(entry.status, role) && (
							<ReviewControls target="entry" id={entry.id} onChanged={onChanged} />
						)}
					</article>
				))}
			</div>
			{action.isError && <Notice text={t("cwie.actionError")} error />}
		</section>
	);
}

type EntryPayload =
	| {
			type: "daily_log";
			placementId: string;
			workDate: string;
			activities: string;
			learning: string;
			problems?: string;
			solutions?: string;
			hoursWorked: number;
	  }
	| {
			type: "weekly_plan";
			placementId: string;
			periodStart: string;
			periodEnd: string;
			weekNumber: number;
			plannedTasks: string;
			actualTasks: string;
			problems?: string;
			solutions?: string;
			plannedHours: number;
			hoursWorked: number;
			completionPercentage: number;
	  }
	| {
			type: "experience";
			placementId: string;
			workDate: string;
			activities: string;
			learning: string;
			problems: string;
			solutions: string;
			outcomes: string;
	  };

function EntryForm({
	placementId,
	entry,
	pending,
	onCancel,
	onSave,
}: {
	placementId: string;
	entry?: Entry;
	pending: boolean;
	onCancel: () => void;
	onSave: (data: EntryPayload) => void;
}) {
	const { t } = useLanguage();
	const [type, setType] = useState<EntryType>(entry?.type ?? "daily_log");
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const text = (name: string) => String(data.get(name) ?? "").trim();
		if (type === "daily_log")
			onSave({
				type,
				placementId,
				workDate: text("workDate"),
				activities: text("activities"),
				learning: text("learning"),
				problems: text("problems") || undefined,
				solutions: text("solutions") || undefined,
				hoursWorked: Number(data.get("hoursWorked")),
			});
		else if (type === "weekly_plan")
			onSave({
				type,
				placementId,
				periodStart: text("periodStart"),
				periodEnd: text("periodEnd"),
				weekNumber: Number(data.get("weekNumber")),
				plannedTasks: text("plannedTasks"),
				actualTasks: text("actualTasks"),
				problems: text("problems") || undefined,
				solutions: text("solutions") || undefined,
				plannedHours: Number(data.get("plannedHours")),
				hoursWorked: Number(data.get("hoursWorked")),
				completionPercentage: Number(data.get("completionPercentage")),
			});
		else
			onSave({
				type,
				placementId,
				workDate: text("workDate"),
				activities: text("activities"),
				learning: text("learning"),
				problems: text("problems"),
				solutions: text("solutions"),
				outcomes: text("outcomes"),
			});
	}
	return (
		<form key={entry?.id ?? type} onSubmit={submit} className="rounded-2xl border bg-card p-6">
			<h2 className="text-lg font-bold">{entry ? t("cwie.editEntry") : t("cwie.newEntry")}</h2>
			<select
				disabled={Boolean(entry)}
				value={type}
				onChange={(e) => setType(e.target.value as EntryType)}
				className="mt-4 h-11 rounded-xl border bg-background px-3"
			>
				<option value="daily_log">{t("cwie.type.daily_log")}</option>
				<option value="weekly_plan">{t("cwie.type.weekly_plan")}</option>
				<option value="experience">{t("cwie.type.experience")}</option>
			</select>
			<div className="mt-4 grid gap-4 md:grid-cols-2">
				{type === "weekly_plan" ? (
					<>
						<Field
							name="periodStart"
							type="date"
							label={t("cwie.periodStart")}
							value={entry?.periodStart}
						/>
						<Field
							name="periodEnd"
							type="date"
							label={t("cwie.periodEnd")}
							value={entry?.periodEnd}
						/>
						<Field
							name="weekNumber"
							type="number"
							label={t("cwie.weekNumber")}
							value={entry?.weekNumber}
						/>
						<Field
							name="plannedHours"
							type="number"
							label={t("cwie.plannedHours")}
							value={entry?.plannedHours}
						/>
						<Area name="plannedTasks" label={t("cwie.plannedTasks")} value={entry?.plannedTasks} />
						<Area name="actualTasks" label={t("cwie.actualTasks")} value={entry?.actualTasks} />
						<Field
							name="hoursWorked"
							type="number"
							label={t("cwie.hoursWorked")}
							value={entry?.hoursWorked}
						/>
						<Field
							name="completionPercentage"
							type="number"
							label={t("cwie.completion")}
							value={entry?.completionPercentage}
						/>
					</>
				) : (
					<>
						<Field name="workDate" type="date" label={t("cwie.workDate")} value={entry?.workDate} />
						<Area name="activities" label={t("cwie.activities")} value={entry?.activities} />
						<Area name="learning" label={t("cwie.learning")} value={entry?.learning} />
						{type === "daily_log" && (
							<Field
								name="hoursWorked"
								type="number"
								label={t("cwie.hoursWorked")}
								value={entry?.hoursWorked}
							/>
						)}
						{type === "experience" && (
							<Area name="outcomes" label={t("cwie.outcomes")} value={entry?.outcomes} />
						)}
					</>
				)}
				<Area
					name="problems"
					label={t("cwie.problems")}
					value={entry?.problems}
					required={type === "experience"}
				/>
				<Area
					name="solutions"
					label={t("cwie.solutions")}
					value={entry?.solutions}
					required={type === "experience"}
				/>
			</div>
			<div className="mt-5 flex gap-2">
				<Button disabled={pending}>{pending ? t("cwie.saving") : t("cwie.saveDraft")}</Button>
				{entry && (
					<Button type="button" variant="outline" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
				)}
			</div>
		</form>
	);
}

function VisitSection({
	placementId,
	role,
	visits,
	onChanged,
}: {
	placementId: string;
	role?: OrganizationRole;
	visits: Visit[];
	onChanged: () => Promise<unknown>;
}) {
	const { t } = useLanguage();
	const [editing, setEditing] = useState<Visit>();
	const action = useMutation({
		mutationFn: async (data: VisitPayload) => {
			const response = editing
				? await apiClient.api.v1.cwie.visits[":visitId"].$put({
						param: { visitId: editing.id },
						json: data,
					})
				: await apiClient.api.v1.cwie.visits.$post({ json: { placementId, ...data } });
			if (!response.ok) throw new Error(`CWIE_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setEditing(undefined);
			await onChanged();
		},
	});
	return (
		<section className="space-y-5">
			{canManageCwieVisits(role) && (
				<VisitForm
					visit={editing}
					pending={action.isPending}
					onCancel={() => setEditing(undefined)}
					onSave={(data) => action.mutate(data)}
				/>
			)}
			{visits.length === 0 && <Notice text={t("cwie.visitsEmpty")} />}
			<div className="grid gap-4">
				{visits.map((visit) => (
					<article key={visit.id} className="rounded-2xl border bg-card p-6">
						<div className="flex justify-between gap-4">
							<div>
								<h2 className="font-bold">
									{t("cwie.visitNumber", { number: visit.visitNumber })}
								</h2>
								<p className="text-sm text-muted-foreground">
									{new Date(visit.scheduledAt).toLocaleString()} · {t(cwieKey("mode", visit.mode))}
								</p>
							</div>
							<Status value={visit.status} />
						</div>
						{visit.location && <p className="mt-3">{visit.location}</p>}
						{visit.notes && <p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p>}
						{visit.status === "completed" && (
							<div className="mt-4 grid gap-2 rounded-xl bg-muted p-4 text-sm">
								<p>
									<b>{t("cwie.workObserved")}:</b> {visit.workObserved}
								</p>
								<p>
									<b>{t("cwie.studentProgress")}:</b> {visit.studentProgress}
								</p>
								<p>
									<b>{t("cwie.issuesFound")}:</b> {visit.issuesFound}
								</p>
								<p>
									<b>{t("cwie.solutionsAgreed")}:</b> {visit.solutionsAgreed}
								</p>
								<p>
									<b>{t("cwie.recommendations")}:</b> {visit.recommendations}
								</p>
							</div>
						)}
						{canManageCwieVisits(role) && visit.status !== "completed" && (
							<div className="mt-4 flex flex-wrap gap-2">
								<Button variant="outline" onClick={() => setEditing(visit)}>
									<Pencil /> {t("common.edit")}
								</Button>
								{visit.status === "scheduled" && (
									<VisitReportForm visitId={visit.id} onChanged={onChanged} />
								)}
							</div>
						)}
					</article>
				))}
			</div>
			{action.isError && <Notice text={t("cwie.actionError")} error />}
		</section>
	);
}

type VisitPayload = {
	visitNumber: number;
	scheduledAt: string;
	mode: "onsite" | "online";
	location?: string;
	notes?: string;
	status?: "scheduled" | "cancelled";
};
function VisitForm({
	visit,
	pending,
	onCancel,
	onSave,
}: {
	visit?: Visit;
	pending: boolean;
	onCancel: () => void;
	onSave: (data: VisitPayload) => void;
}) {
	const { t } = useLanguage();
	return (
		<form
			key={visit?.id ?? "new"}
			className="rounded-2xl border bg-card p-6"
			onSubmit={(event) => {
				event.preventDefault();
				const d = new FormData(event.currentTarget);
				onSave({
					visitNumber: Number(d.get("visitNumber")),
					scheduledAt: new Date(String(d.get("scheduledAt"))).toISOString(),
					mode: String(d.get("mode")) as "onsite" | "online",
					location: String(d.get("location") ?? "").trim() || undefined,
					notes: String(d.get("notes") ?? "").trim() || undefined,
					status: visit?.status === "cancelled" ? "cancelled" : "scheduled",
				});
			}}
		>
			<h2 className="text-lg font-bold">{visit ? t("cwie.editVisit") : t("cwie.scheduleVisit")}</h2>
			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<Field
					name="visitNumber"
					type="number"
					label={t("cwie.visitNumberField")}
					value={visit?.visitNumber}
					min={1}
					max={3}
				/>
				<Field
					name="scheduledAt"
					type="datetime-local"
					label={t("cwie.scheduledAt")}
					value={visit?.scheduledAt ? localDateTime(visit.scheduledAt) : undefined}
				/>
				<SelectField
					name="mode"
					label={t("cwie.mode")}
					value={visit?.mode}
					options={[
						["onsite", t("cwie.mode.onsite")],
						["online", t("cwie.mode.online")],
					]}
				/>
				<Field
					name="location"
					label={t("cwie.location")}
					value={visit?.location}
					required={false}
				/>
				<Area name="notes" label={t("cwie.notes")} value={visit?.notes} required={false} />
			</div>
			<div className="mt-5 flex gap-2">
				<Button disabled={pending}>{t("cwie.saveVisit")}</Button>
				{visit && (
					<Button type="button" variant="outline" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
				)}
			</div>
		</form>
	);
}

function VisitReportForm({
	visitId,
	onChanged,
}: {
	visitId: string;
	onChanged: () => Promise<unknown>;
}) {
	const { t } = useLanguage();
	const [open, setOpen] = useState(false);
	const action = useMutation({
		mutationFn: async (json: {
			visitedAt: string;
			workObserved: string;
			studentProgress: string;
			issuesFound: string;
			solutionsAgreed: string;
			recommendations: string;
		}) => {
			const response = await apiClient.api.v1.cwie.visits[":visitId"].report.$post({
				param: { visitId },
				json,
			});
			if (!response.ok) throw new Error();
			return response.json();
		},
		onSuccess: async () => {
			setOpen(false);
			await onChanged();
		},
	});
	if (!open)
		return (
			<Button onClick={() => setOpen(true)}>
				<BookOpenCheck /> {t("cwie.recordVisit")}
			</Button>
		);
	return (
		<form
			className="mt-4 w-full rounded-xl bg-muted p-4"
			onSubmit={(event) => {
				event.preventDefault();
				const d = new FormData(event.currentTarget);
				const value = (n: string) => String(d.get(n) ?? "");
				action.mutate({
					visitedAt: new Date(value("visitedAt")).toISOString(),
					workObserved: value("workObserved"),
					studentProgress: value("studentProgress"),
					issuesFound: value("issuesFound"),
					solutionsAgreed: value("solutionsAgreed"),
					recommendations: value("recommendations"),
				});
			}}
		>
			<div className="grid gap-3 md:grid-cols-2">
				<Field name="visitedAt" type="datetime-local" label={t("cwie.visitedAt")} />
				<Area name="workObserved" label={t("cwie.workObserved")} />
				<Area name="studentProgress" label={t("cwie.studentProgress")} />
				<Area name="issuesFound" label={t("cwie.issuesFound")} />
				<Area name="solutionsAgreed" label={t("cwie.solutionsAgreed")} />
				<Area name="recommendations" label={t("cwie.recommendations")} />
			</div>
			<div className="mt-4 flex gap-2">
				<Button disabled={action.isPending}>{t("cwie.completeVisit")}</Button>
				<Button type="button" variant="outline" onClick={() => setOpen(false)}>
					{t("common.cancel")}
				</Button>
			</div>
		</form>
	);
}

function SummarySection({
	placementId,
	role,
	summaries,
	onChanged,
}: {
	placementId: string;
	role?: OrganizationRole;
	summaries: Summary[];
	onChanged: () => Promise<unknown>;
}) {
	const { t } = useLanguage();
	const [editing, setEditing] = useState<Summary>();
	const action = useMutation({
		mutationFn: async (
			input: { kind: "save"; data: SummaryPayload; id?: string } | { kind: "submit"; id: string },
		) => {
			const response =
				input.kind === "submit"
					? await apiClient.api.v1.cwie["monthly-summaries"][":summaryId"].submit.$post({
							param: { summaryId: input.id },
						})
					: input.id
						? await apiClient.api.v1.cwie["monthly-summaries"][":summaryId"].$put({
								param: { summaryId: input.id },
								json: input.data,
							})
						: await apiClient.api.v1.cwie["monthly-summaries"].$post({ json: input.data });
			if (!response.ok) throw new Error();
			return response.json();
		},
		onSuccess: async () => {
			setEditing(undefined);
			await onChanged();
		},
	});
	return (
		<section className="space-y-5">
			{role === "student" && (
				<SummaryForm
					placementId={placementId}
					summary={editing}
					pending={action.isPending}
					onCancel={() => setEditing(undefined)}
					onSave={(data) => action.mutate({ kind: "save", data, id: editing?.id })}
				/>
			)}
			{summaries.length === 0 && <Notice text={t("cwie.summariesEmpty")} />}
			<div className="grid gap-4">
				{summaries.map((summary) => (
					<article key={summary.id} className="rounded-2xl border bg-card p-6">
						<div className="flex justify-between gap-4">
							<h2 className="font-bold">{summary.month.slice(0, 7)}</h2>
							<Status value={summary.status} />
						</div>
						<div className="mt-4 grid gap-3 text-sm">
							<p>
								<b>{t("cwie.summary")}:</b> {summary.summary}
							</p>
							<p>
								<b>{t("cwie.achievements")}:</b> {summary.achievements}
							</p>
							<p>
								<b>{t("cwie.challenges")}:</b> {summary.challenges}
							</p>
							<p>
								<b>{t("cwie.nextMonthPlan")}:</b> {summary.nextMonthPlan}
							</p>
							<p>
								<b>{t("cwie.totalHours")}:</b> {summary.totalHours}
							</p>
						</div>
						<ReviewSummary record={summary} />
						{canEditCwie(summary.status, role) && (
							<div className="mt-5 flex gap-2">
								<Button variant="outline" onClick={() => setEditing(summary)}>
									<Pencil /> {t("common.edit")}
								</Button>
								<Button onClick={() => action.mutate({ kind: "submit", id: summary.id })}>
									<Send /> {t("cwie.submit")}
								</Button>
							</div>
						)}
						{canReviewCwie(summary.status, role) && (
							<ReviewControls target="summary" id={summary.id} onChanged={onChanged} />
						)}
					</article>
				))}
			</div>
			{action.isError && <Notice text={t("cwie.actionError")} error />}
		</section>
	);
}

type SummaryPayload = {
	placementId: string;
	month: string;
	summary: string;
	achievements: string;
	challenges: string;
	nextMonthPlan: string;
	totalHours: number;
};
function SummaryForm({
	placementId,
	summary,
	pending,
	onCancel,
	onSave,
}: {
	placementId: string;
	summary?: Summary;
	pending: boolean;
	onCancel: () => void;
	onSave: (data: SummaryPayload) => void;
}) {
	const { t } = useLanguage();
	return (
		<form
			key={summary?.id ?? "new"}
			className="rounded-2xl border bg-card p-6"
			onSubmit={(event) => {
				event.preventDefault();
				const d = new FormData(event.currentTarget);
				const value = (n: string) => String(d.get(n) ?? "");
				onSave({
					placementId,
					month: value("month"),
					summary: value("summary"),
					achievements: value("achievements"),
					challenges: value("challenges"),
					nextMonthPlan: value("nextMonthPlan"),
					totalHours: Number(d.get("totalHours")),
				});
			}}
		>
			<h2 className="text-lg font-bold">
				{summary ? t("cwie.editSummary") : t("cwie.newSummary")}
			</h2>
			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<Field
					name="month"
					type="month"
					label={t("cwie.month")}
					value={summary?.month.slice(0, 7)}
				/>
				<Field
					name="totalHours"
					type="number"
					label={t("cwie.totalHours")}
					value={summary?.totalHours}
				/>
				<Area name="summary" label={t("cwie.summary")} value={summary?.summary} />
				<Area name="achievements" label={t("cwie.achievements")} value={summary?.achievements} />
				<Area name="challenges" label={t("cwie.challenges")} value={summary?.challenges} />
				<Area name="nextMonthPlan" label={t("cwie.nextMonthPlan")} value={summary?.nextMonthPlan} />
			</div>
			<div className="mt-5 flex gap-2">
				<Button disabled={pending}>{t("cwie.saveDraft")}</Button>
				{summary && (
					<Button type="button" variant="outline" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
				)}
			</div>
		</form>
	);
}

function ReviewControls({
	target,
	id,
	onChanged,
}: {
	target: "entry" | "summary";
	id: string;
	onChanged: () => Promise<unknown>;
}) {
	const { t } = useLanguage();
	const [comment, setComment] = useState("");
	const action = useMutation({
		mutationFn: async (decision: "approved" | "revision_requested") => {
			const json = { decision, comment: comment.trim() || undefined };
			const response =
				target === "entry"
					? await apiClient.api.v1.cwie.entries[":entryId"].review.$post({
							param: { entryId: id },
							json,
						})
					: await apiClient.api.v1.cwie["monthly-summaries"][":summaryId"].review.$post({
							param: { summaryId: id },
							json,
						});
			if (!response.ok) throw new Error();
			return response.json();
		},
		onSuccess: onChanged,
	});
	return (
		<div className="mt-5 rounded-xl bg-muted p-4">
			<label className="grid gap-2 text-sm font-semibold">
				{t("cwie.reviewComment")}
				<textarea
					className="min-h-20 rounded-lg border bg-card p-3 font-normal"
					value={comment}
					onChange={(event) => setComment(event.target.value)}
				/>
			</label>
			<div className="mt-3 flex flex-wrap gap-2">
				<Button disabled={action.isPending} onClick={() => action.mutate("approved")}>
					{t("cwie.approve")}
				</Button>
				<Button
					variant="outline"
					disabled={action.isPending || comment.trim().length < 3}
					onClick={() => action.mutate("revision_requested")}
				>
					{t("cwie.requestRevision")}
				</Button>
			</div>
			{action.isError && <p className="mt-2 text-sm text-destructive">{t("cwie.actionError")}</p>}
		</div>
	);
}

function EntryDetails({ entry }: { entry: Entry }) {
	const { t } = useLanguage();
	const rows =
		entry.type === "weekly_plan"
			? [
					[t("cwie.plannedTasks"), entry.plannedTasks],
					[t("cwie.actualTasks"), entry.actualTasks],
					[t("cwie.completion"), `${entry.completionPercentage}%`],
					[t("cwie.hoursWorked"), entry.hoursWorked],
				]
			: [
					[t("cwie.activities"), entry.activities],
					[t("cwie.learning"), entry.learning],
					[t("cwie.outcomes"), entry.outcomes],
					[t("cwie.hoursWorked"), entry.hoursWorked],
				];
	return (
		<div className="mt-4 grid gap-2 text-sm">
			{rows
				.filter(([, value]) => value !== null)
				.map(([label, value]) => (
					<p key={String(label)}>
						<b>{label}:</b> {value}
					</p>
				))}
			{entry.problems && (
				<p>
					<b>{t("cwie.problems")}:</b> {entry.problems}
				</p>
			)}
			{entry.solutions && (
				<p>
					<b>{t("cwie.solutions")}:</b> {entry.solutions}
				</p>
			)}
		</div>
	);
}
function ReviewSummary({
	record,
}: {
	record: Pick<
		Entry,
		"advisorDecision" | "advisorComment" | "supervisorDecision" | "supervisorComment"
	>;
}) {
	const { t } = useLanguage();
	return (
		<div className="mt-4 grid gap-3 md:grid-cols-2">
			<ReviewBox
				label={t("role.advisor")}
				decision={record.advisorDecision}
				comment={record.advisorComment}
			/>
			<ReviewBox
				label={t("role.supervisor")}
				decision={record.supervisorDecision}
				comment={record.supervisorComment}
			/>
		</div>
	);
}
function ReviewBox({
	label,
	decision,
	comment,
}: {
	label: string;
	decision: string | null;
	comment: string | null;
}) {
	const { t } = useLanguage();
	return (
		<div className="rounded-xl bg-muted p-3 text-sm">
			<p className="font-semibold">
				{label}: {decision ? t(cwieKey("status", decision)) : t("cwie.pendingReview")}
			</p>
			{comment && <p className="mt-1 text-muted-foreground">{comment}</p>}
		</div>
	);
}
function Status({ value }: { value: string }) {
	const { t } = useLanguage();
	return (
		<span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
			{t(cwieKey("status", value))}
		</span>
	);
}
function TabButton({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<Button variant={active ? "default" : "ghost"} onClick={onClick}>
			{children}
		</Button>
	);
}
function Field({
	name,
	label,
	type = "text",
	value,
	required = true,
	min,
	max,
}: {
	name: string;
	label: string;
	type?: string;
	value?: string | number | null;
	required?: boolean;
	min?: number;
	max?: number;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<input
				name={name}
				type={type}
				defaultValue={value ?? ""}
				required={required}
				min={min ?? (type === "number" ? 0 : undefined)}
				max={max}
				className="h-11 rounded-xl border bg-background px-3 font-normal"
			/>
		</label>
	);
}
function Area({
	name,
	label,
	value,
	required = true,
}: {
	name: string;
	label: string;
	value?: string | null;
	required?: boolean;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<textarea
				name={name}
				defaultValue={value ?? ""}
				required={required}
				minLength={required ? 3 : undefined}
				className="min-h-24 rounded-xl border bg-background p-3 font-normal"
			/>
		</label>
	);
}
function SelectField({
	name,
	label,
	value,
	options,
}: {
	name: string;
	label: string;
	value?: string;
	options: Array<[string, string]>;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<select
				name={name}
				defaultValue={value}
				className="h-11 rounded-xl border bg-background px-3 font-normal"
			>
				{options.map(([key, text]) => (
					<option key={key} value={key}>
						{text}
					</option>
				))}
			</select>
		</label>
	);
}
function Notice({ text, error = false }: { text: string; error?: boolean }) {
	return (
		<p
			role={error ? "alert" : undefined}
			className={`rounded-xl border p-4 text-sm ${error ? "border-destructive/20 bg-destructive-muted text-destructive" : "bg-muted text-muted-foreground"}`}
		>
			{text}
		</p>
	);
}
function localDateTime(value: string) {
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
function cwieKey(group: "type" | "mode" | "status", value: string) {
	return `cwie.${group}.${value}` as MessageKey;
}
async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
	return response.json();
}
