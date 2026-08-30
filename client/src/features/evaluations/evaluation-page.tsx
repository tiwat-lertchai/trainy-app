import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import {
	canEditEvaluation,
	evaluatorKeys,
	visibleEvaluations,
	type EvaluationStatus,
	type EvaluatorType,
} from "./evaluation-rules";

const WORKSPACE_KEY = "trainy-workspace-id";
type Scores = {
	technicalScore: number;
	communicationScore: number;
	responsibilityScore: number;
	comment: string;
};

export function EvaluationPage() {
	const { locale, t } = useLanguage();
	const queryClient = useQueryClient();
	const [selectedPlacement, setSelectedPlacement] = useState("");
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations });
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const role = context?.membership.role;
	const isStudent = role === "student";
	const isEvaluator = role === "advisor" || role === "supervisor";
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
	const evaluations = useQuery({
		queryKey: ["evaluations", placementId],
		queryFn: async () => {
			const response = await apiClient.api.v1.evaluations.placements[":placementId"].$get({
				param: { placementId },
			});
			if (!response.ok) throw new Error("EVALUATIONS_FAILED");
			return response.json();
		},
		enabled: Boolean(placementId),
	});
	const records = visibleEvaluations(evaluations.data?.data ?? [], role);
	const ownEvaluation = isEvaluator
		? evaluations.data?.data.find((record) => record.evaluatorType === role)
		: undefined;
	const action = useMutation({
		mutationFn: async (
			input: { kind: "save"; scores: Scores } | { kind: "submit"; id: string },
		) => {
			if (input.kind === "save") {
				const response = await apiClient.api.v1.evaluations.$post({
					json: { placementId, ...input.scores },
				});
				if (!response.ok) throw new Error(`EVALUATION_${response.status}`);
				return response.json();
			}
			const response = await apiClient.api.v1.evaluations[":evaluationId"].submit.$post({
				param: { evaluationId: input.id },
			});
			if (!response.ok) throw new Error(`EVALUATION_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setConfirmingId(null);
			await queryClient.invalidateQueries({ queryKey: ["evaluations", placementId] });
		},
	});

	return (
		<div>
			<p className="text-sm font-semibold text-primary">{t("evaluations.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("evaluations.title")}</h1>
			<p className="mt-2 text-muted-foreground">{t("evaluations.description")}</p>
			<label className="mt-6 grid max-w-xl gap-2 text-sm font-semibold">
				{t("evaluations.placement")}
				<select
					className="h-11 rounded-xl border bg-white px-3"
					value={placementId}
					onChange={(event) => {
						setSelectedPlacement(event.target.value);
						setConfirmingId(null);
					}}
				>
					<option value="" disabled>
						{t("evaluations.selectPlacement")}
					</option>
					{placements.data?.data.map((placement) => (
						<option key={placement.id} value={placement.id}>
							{(placement as typeof placement & { internship?: { title: string } }).internship
								?.title ?? placement.id.slice(0, 8)}
						</option>
					))}
				</select>
			</label>
			{canEditEvaluation(ownEvaluation?.status as EvaluationStatus | undefined, isEvaluator) &&
				placementId && (
					<EvaluationForm
						key={`${placementId}-${ownEvaluation?.updatedAt ?? "new"}`}
						evaluation={ownEvaluation}
						pending={action.isPending}
						onSave={(scores) => action.mutate({ kind: "save", scores })}
					/>
				)}
			{ownEvaluation?.status === "draft" && (
				<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
					<h2 className="font-bold">{t("evaluations.draftNotice")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("evaluations.draftDetail")}</p>
					{confirmingId === ownEvaluation.id ? (
						<div className="mt-4 flex flex-wrap gap-2">
							<Button
								disabled={action.isPending}
								onClick={() => action.mutate({ kind: "submit", id: ownEvaluation.id })}
							>
								<Send />
								{t("evaluations.confirmSubmit")}
							</Button>
							<Button variant="outline" onClick={() => setConfirmingId(null)}>
								{t("evaluations.cancel")}
							</Button>
						</div>
					) : (
						<Button
							className="mt-4"
							variant="outline"
							onClick={() => setConfirmingId(ownEvaluation.id)}
						>
							{t("evaluations.submit")}
						</Button>
					)}
				</div>
			)}
			{evaluations.isLoading && <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted" />}
			{evaluations.isError && <Notice message={t("evaluations.loadError")} error />}
			{!evaluations.isLoading && records.length === 0 && (
				<Notice message={isStudent ? t("evaluations.emptyStudent") : t("evaluations.empty")} />
			)}
			<div className="mt-8 grid gap-4 md:grid-cols-2">
				{records.map((record) => (
					<article key={record.id} className="rounded-2xl border bg-white p-6">
						<div className="flex items-start justify-between">
							<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
								<ClipboardCheck />
							</span>
							<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
								{t(
									record.status === "submitted"
										? "evaluations.status.submitted"
										: "evaluations.status.draft",
								)}
							</span>
						</div>
						<h2 className="mt-5 font-bold">
							{t(evaluatorKeys[record.evaluatorType as EvaluatorType])}
						</h2>
						<div className="mt-4 grid grid-cols-3 gap-2">
							<Score label={t("evaluations.technical")} value={record.technicalScore} />
							<Score label={t("evaluations.communication")} value={record.communicationScore} />
							<Score label={t("evaluations.responsibility")} value={record.responsibilityScore} />
						</div>
						<p className="mt-5 whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm leading-6">
							{record.comment}
						</p>
						{record.submittedAt && (
							<p className="mt-3 text-xs text-muted-foreground">
								{t("evaluations.submittedAt", { date: formatDate(record.submittedAt, locale) })}
							</p>
						)}
					</article>
				))}
			</div>
			{action.isError && <Notice message={t("evaluations.actionError")} error />}
		</div>
	);
}

function EvaluationForm({
	evaluation,
	pending,
	onSave,
}: {
	evaluation?: Scores;
	pending: boolean;
	onSave: (scores: Scores) => void;
}) {
	const { t } = useLanguage();
	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		onSave({
			technicalScore: Number(data.get("technical")),
			communicationScore: Number(data.get("communication")),
			responsibilityScore: Number(data.get("responsibility")),
			comment: String(data.get("comment")),
		});
	}
	return (
		<form
			className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-3"
			onSubmit={submit}
		>
			<ScoreField
				name="technical"
				label={t("evaluations.technical")}
				value={evaluation?.technicalScore}
			/>
			<ScoreField
				name="communication"
				label={t("evaluations.communication")}
				value={evaluation?.communicationScore}
			/>
			<ScoreField
				name="responsibility"
				label={t("evaluations.responsibility")}
				value={evaluation?.responsibilityScore}
			/>
			<label className="grid gap-2 text-sm font-semibold sm:col-span-3">
				{t("evaluations.comment")}
				<textarea
					name="comment"
					minLength={10}
					maxLength={5000}
					required
					defaultValue={evaluation?.comment}
					className="min-h-32 rounded-xl border p-3 font-normal"
				/>
			</label>
			<Button className="sm:col-span-3" disabled={pending}>
				{t(
					pending
						? "evaluations.saving"
						: evaluation
							? "evaluations.saveChanges"
							: "evaluations.saveDraft",
				)}
			</Button>
		</form>
	);
}
function ScoreField({ name, label, value }: { name: string; label: string; value?: number }) {
	const { t } = useLanguage();
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<select
				name={name}
				required
				defaultValue={value ?? 3}
				className="h-11 rounded-xl border bg-white px-3 font-normal"
			>
				{[1, 2, 3, 4, 5].map((score) => (
					<option key={score} value={score}>
						{t("evaluations.score", { score })}
					</option>
				))}
			</select>
		</label>
	);
}
function Score({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl bg-muted p-3 text-center">
			<Star className="mx-auto size-4 fill-amber-400 text-amber-400" />
			<p className="mt-1 text-xl font-black">{value}/5</p>
			<p className="mt-1 text-xs text-muted-foreground">{label}</p>
		</div>
	);
}
async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
	return response.json();
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
	return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
		new Date(value),
	);
}
