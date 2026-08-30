import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarDays, Clock3, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import { canEditReport, canReviewReport } from "./progress-rules";

const WORKSPACE_KEY = "trainy-workspace-id";
type FormDataValue = {
	periodStart: string;
	periodEnd: string;
	summary: string;
	hoursWorked: number;
};

export function ProgressPage() {
	const { locale, t } = useLanguage();
	const queryClient = useQueryClient();
	const [selectedPlacement, setSelectedPlacement] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [revisionId, setRevisionId] = useState<string | null>(null);
	const [feedback, setFeedback] = useState("");
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations });
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const role = context?.membership.role;
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
	const placementId = selectedPlacement || placements.data?.data[0]?.id || "";
	const reports = useQuery({
		queryKey: ["progress", placementId],
		queryFn: async () => {
			const response = await apiClient.api.v1["progress-reports"].placements[":placementId"].$get({
				param: { placementId },
			});
			if (!response.ok) throw new Error("PROGRESS_FAILED");
			return response.json();
		},
		enabled: Boolean(placementId),
	});
	const editingReport = reports.data?.data.find((item) => item.id === editingId);
	const action = useMutation({
		mutationFn: async (
			input:
				| { kind: "create"; data: FormDataValue }
				| { kind: "update"; id: string; data: FormDataValue }
				| { kind: "submit"; id: string }
				| {
						kind: "review";
						id: string;
						decision: "approved" | "revision_requested";
						feedback?: string;
				  },
		) => {
			if (input.kind === "create") {
				const response = await apiClient.api.v1["progress-reports"].$post({
					json: { placementId, ...input.data },
				});
				if (!response.ok) throw new Error(`PROGRESS_${response.status}`);
				return response.json();
			}
			if (input.kind === "update") {
				const response = await apiClient.api.v1["progress-reports"][":reportId"].$patch({
					param: { reportId: input.id },
					json: input.data,
				});
				if (!response.ok) throw new Error(`PROGRESS_${response.status}`);
				return response.json();
			}
			if (input.kind === "submit") {
				const response = await apiClient.api.v1["progress-reports"][":reportId"].submit.$post({
					param: { reportId: input.id },
				});
				if (!response.ok) throw new Error(`PROGRESS_${response.status}`);
				return response.json();
			}
			const response = await apiClient.api.v1["progress-reports"][":reportId"].review.$post({
				param: { reportId: input.id },
				json: { decision: input.decision, feedback: input.feedback },
			});
			if (!response.ok) throw new Error(`PROGRESS_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setEditingId(null);
			setRevisionId(null);
			setFeedback("");
			await queryClient.invalidateQueries({ queryKey: ["progress", placementId] });
		},
	});

	return (
		<div>
			<p className="text-sm font-semibold text-primary">{t("progress.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("progress.title")}</h1>
			<p className="mt-2 text-muted-foreground">{t("progress.description")}</p>
			<label className="mt-6 grid max-w-xl gap-2 text-sm font-semibold">
				{t("progress.placement")}
				<select
					className="h-11 rounded-xl border bg-white px-3"
					value={placementId}
					onChange={(event) => {
						setSelectedPlacement(event.target.value);
						setEditingId(null);
					}}
				>
					{placements.data?.data.map((placement) => (
						<option key={placement.id} value={placement.id}>
							{(placement as typeof placement & { internship?: { title: string } }).internship
								?.title ?? placement.id.slice(0, 8)}
						</option>
					))}
				</select>
			</label>
			{isStudent && placementId && (
				<ReportForm
					key={editingReport?.id ?? "new"}
					report={editingReport}
					pending={action.isPending}
					onCancel={() => setEditingId(null)}
					onSubmit={(data) =>
						action.mutate(
							editingReport
								? { kind: "update", id: editingReport.id, data }
								: { kind: "create", data },
						)
					}
				/>
			)}
			{reports.isLoading && <div className="mt-8 h-36 animate-pulse rounded-2xl bg-muted" />}
			{reports.isError && <Notice message={t("progress.loadError")} error />}
			{reports.data?.data.length === 0 && <Notice message={t("progress.empty")} />}
			<div className="mt-8 grid gap-4">
				{reports.data?.data.map((report) => (
					<article key={report.id} className="rounded-2xl border bg-white p-6">
						<div className="flex justify-between gap-4">
							<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
								<BookOpen />
							</span>
							<Badge status={report.status} />
						</div>
						<div className="mt-5 flex flex-wrap gap-5 text-sm text-muted-foreground">
							<span className="flex gap-2">
								<CalendarDays className="size-4" />
								{formatDate(report.periodStart, locale)} – {formatDate(report.periodEnd, locale)}
							</span>
							<span className="flex gap-2">
								<Clock3 className="size-4" />
								{t("progress.hours", { count: report.hoursWorked })}
							</span>
						</div>
						<p className="mt-4 whitespace-pre-wrap leading-7">{report.summary}</p>
						{report.feedback && (
							<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm">
								{t("progress.feedback", { feedback: report.feedback })}
							</p>
						)}
						<div className="mt-5 flex flex-wrap gap-2">
							{canEditReport(report.status, isStudent) && (
								<>
									<Button variant="outline" onClick={() => setEditingId(report.id)}>
										<Pencil />
										{t("progress.edit")}
									</Button>
									<Button
										disabled={action.isPending}
										onClick={() => action.mutate({ kind: "submit", id: report.id })}
									>
										{t(
											report.status === "revision_requested"
												? "progress.resubmit"
												: "progress.submit",
										)}
									</Button>
								</>
							)}
							{canReviewReport(report.status, role === "advisor" || role === "supervisor") && (
								<>
									<Button
										disabled={action.isPending}
										onClick={() =>
											action.mutate({ kind: "review", id: report.id, decision: "approved" })
										}
									>
										{t("progress.approve")}
									</Button>
									<Button
										variant="outline"
										onClick={() => setRevisionId(revisionId === report.id ? null : report.id)}
									>
										{t("progress.requestRevision")}
									</Button>
								</>
							)}
						</div>
						{revisionId === report.id && (
							<form
								className="mt-4 grid gap-3 rounded-xl bg-muted p-4"
								onSubmit={(event) => {
									event.preventDefault();
									action.mutate({
										kind: "review",
										id: report.id,
										decision: "revision_requested",
										feedback,
									});
								}}
							>
								<label className="text-sm font-semibold">
									{t("progress.revisionDetails")}
									<textarea
										value={feedback}
										onChange={(event) => setFeedback(event.target.value)}
										minLength={3}
										maxLength={5000}
										required
										className="mt-2 min-h-24 w-full rounded-lg border bg-white p-3 font-normal"
									/>
								</label>
								<Button disabled={action.isPending || feedback.trim().length < 3}>
									{t("progress.sendRevision")}
								</Button>
							</form>
						)}
					</article>
				))}
			</div>
			{action.isError && <Notice message={t("progress.actionError")} error />}
		</div>
	);
}

async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
	return response.json();
}
function ReportForm({
	report,
	pending,
	onCancel,
	onSubmit,
}: {
	report?: { periodStart: string; periodEnd: string; summary: string; hoursWorked: number };
	pending: boolean;
	onCancel: () => void;
	onSubmit: (data: FormDataValue) => void;
}) {
	const { t } = useLanguage();
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const values = new FormData(event.currentTarget);
		onSubmit({
			periodStart: new Date(String(values.get("start"))).toISOString(),
			periodEnd: new Date(String(values.get("end"))).toISOString(),
			summary: String(values.get("summary")),
			hoursWorked: Number(values.get("hours")),
		});
	}
	return (
		<form
			className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-3"
			onSubmit={submit}
		>
			<Field
				name="start"
				label={t("progress.periodStart")}
				type="date"
				defaultValue={toDateInput(report?.periodStart)}
			/>
			<Field
				name="end"
				label={t("progress.periodEnd")}
				type="date"
				defaultValue={toDateInput(report?.periodEnd)}
			/>
			<Field
				name="hours"
				label={t("progress.hoursWorked")}
				type="number"
				defaultValue={report?.hoursWorked}
			/>
			<label className="grid gap-2 text-sm font-semibold sm:col-span-3">
				{t("progress.summary")}
				<textarea
					name="summary"
					minLength={20}
					maxLength={10000}
					required
					defaultValue={report?.summary}
					className="min-h-36 rounded-xl border p-3 font-normal"
				/>
			</label>
			<div className="flex gap-2 sm:col-span-3">
				{report && (
					<Button type="button" variant="outline" onClick={onCancel}>
						{t("common.cancel")}
					</Button>
				)}
				<Button className="flex-1" disabled={pending}>
					{t(pending ? "progress.saving" : report ? "progress.saveChanges" : "progress.saveDraft")}
				</Button>
			</div>
		</form>
	);
}
function Field({
	name,
	label,
	type,
	defaultValue,
}: {
	name: string;
	label: string;
	type: string;
	defaultValue?: string | number;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<input
				name={name}
				type={type}
				min={type === "number" ? 0 : undefined}
				required
				defaultValue={defaultValue}
				className="h-11 rounded-xl border px-3 font-normal"
			/>
		</label>
	);
}
function Badge({ status }: { status: string }) {
	const { t } = useLanguage();
	const keys = {
		draft: "progress.status.draft",
		submitted: "progress.status.submitted",
		approved: "progress.status.approved",
		revision_requested: "progress.status.revisionRequested",
	} as const;
	return (
		<span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
			{status in keys ? t(keys[status as keyof typeof keys]) : status}
		</span>
	);
}
function Notice({ message, error = false }: { message: string; error?: boolean }) {
	return (
		<div
			role={error ? "alert" : undefined}
			className={`mt-6 rounded-2xl border bg-white p-6 text-center text-sm ${error ? "border-destructive/20 text-destructive" : "text-muted-foreground"}`}
		>
			{message}
		</div>
	);
}
function formatDate(value: string | Date, locale: string) {
	return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}
function toDateInput(value?: string | Date) {
	return value ? new Date(value).toISOString().slice(0, 10) : undefined;
}
