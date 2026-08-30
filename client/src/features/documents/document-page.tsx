import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileCheck2, FileText, HardDriveUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import {
	canReviewDocument,
	documentStatusKeys,
	documentTypeKeys,
	validateDocumentFile,
	type DocumentStatus,
} from "./document-rules";

const WORKSPACE_KEY = "trainy-workspace-id";

export function DocumentPage() {
	const { locale, t } = useLanguage();
	const queryClient = useQueryClient();
	const [selectedPlacement, setSelectedPlacement] = useState("");
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [approvingId, setApprovingId] = useState<string | null>(null);
	const [feedback, setFeedback] = useState("");
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [downloadError, setDownloadError] = useState<string | null>(null);
	const [downloadingId, setDownloadingId] = useState<string | null>(null);
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations });
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const role = context?.membership.role;
	const isStudent = role === "student";
	const isReviewer = role === "advisor" || role === "supervisor";
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
	const documents = useQuery({
		queryKey: ["documents", placementId],
		queryFn: async () => {
			const response = await apiClient.api.v1.documents.placements[":placementId"].$get({
				param: { placementId },
			});
			if (!response.ok) throw new Error("DOCUMENTS_FAILED");
			return response.json();
		},
		enabled: Boolean(placementId),
	});
	const review = useMutation({
		mutationFn: async (input: {
			id: string;
			decision: "approved" | "rejected";
			feedback?: string;
		}) => {
			const response = await apiClient.api.v1.documents[":documentId"].review.$post({
				param: { documentId: input.id },
				json: { decision: input.decision, feedback: input.feedback },
			});
			if (!response.ok) throw new Error(`DOCUMENT_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setRejectingId(null);
			setApprovingId(null);
			setFeedback("");
			await queryClient.invalidateQueries({ queryKey: ["documents", placementId] });
		},
	});
	const upload = useMutation({
		mutationFn: async (input: {
			type: "resume" | "consent" | "progress_evidence" | "final_report" | "other";
			file: File;
		}) => {
			const response = await apiClient.api.v1.documents.$post({
				form: { placementId, type: input.type, file: input.file },
			});
			if (!response.ok) throw new Error(`DOCUMENT_UPLOAD_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setUploadError(null);
			await queryClient.invalidateQueries({ queryKey: ["documents", placementId] });
		},
	});

	function submitFile(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const file = form.get("file");
		if (!(file instanceof File)) {
			setUploadError(t("documents.selectFile"));
			return;
		}
		const validationError = validateDocumentFile(file);
		if (validationError) {
			setUploadError(t(validationError));
			return;
		}
		setUploadError(null);
		upload.mutate(
			{
				type: String(form.get("type")) as
					"resume" | "consent" | "progress_evidence" | "final_report" | "other",
				file,
			},
			{ onSuccess: () => formElement.reset() },
		);
	}

	async function downloadDocument(id: string, fileName: string) {
		setDownloadingId(id);
		setDownloadError(null);
		try {
			const response = await apiClient.api.v1.documents[":documentId"].download.$get({
				param: { documentId: id },
			});
			if (!response.ok) throw new Error(`DOCUMENT_DOWNLOAD_${response.status}`);
			const url = URL.createObjectURL(await response.blob());
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			setDownloadError(t("documents.downloadError"));
		} finally {
			setDownloadingId(null);
		}
	}

	return (
		<div>
			<p className="text-sm font-semibold text-primary">{t("documents.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("documents.title")}</h1>
			<p className="mt-2 text-muted-foreground">{t("documents.description")}</p>
			<label className="mt-6 grid max-w-xl gap-2 text-sm font-semibold">
				{t("documents.placement")}
				<select
					className="h-11 rounded-xl border bg-white px-3"
					value={placementId}
					onChange={(event) => {
						setSelectedPlacement(event.target.value);
						setRejectingId(null);
					}}
				>
					<option value="" disabled>
						{t("documents.selectPlacement")}
					</option>
					{placements.data?.data.map((placement) => (
						<option key={placement.id} value={placement.id}>
							{(placement as typeof placement & { internship?: { title: string } }).internship
								?.title ?? placement.id.slice(0, 8)}
						</option>
					))}
				</select>
			</label>
			{isStudent && placementId && (
				<form
					className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto] sm:items-end"
					onSubmit={submitFile}
				>
					<label className="grid gap-2 text-sm font-semibold">
						{t("documents.typeLabel")}
						<select name="type" className="h-11 rounded-xl border bg-white px-3 font-normal">
							{Object.entries(documentTypeKeys).map(([value, key]) => (
								<option key={value} value={value}>
									{t(key)}
								</option>
							))}
						</select>
					</label>
					<label className="grid gap-2 text-sm font-semibold">
						{t("documents.fileLabel")}
						<input
							name="file"
							type="file"
							accept="application/pdf,image/jpeg,image/png"
							required
							className="h-11 rounded-xl border bg-white px-3 py-2 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1"
						/>
					</label>
					<Button disabled={upload.isPending}>
						<HardDriveUpload />
						{t(upload.isPending ? "documents.uploading" : "documents.upload")}
					</Button>
					{uploadError && (
						<p role="alert" className="text-sm text-destructive sm:col-span-3">
							{uploadError}
						</p>
					)}
					{upload.isError && (
						<p role="alert" className="text-sm text-destructive sm:col-span-3">
							{t("documents.uploadError")}
						</p>
					)}
				</form>
			)}
			{documents.isLoading && <div className="mt-8 h-36 animate-pulse rounded-2xl bg-muted" />}
			{documents.isError && <Notice message={t("documents.loadError")} error />}
			{documents.data?.data.length === 0 && <Notice message={t("documents.empty")} />}
			<div className="mt-8 grid gap-4">
				{documents.data?.data.map((document) => (
					<article key={document.id} className="rounded-2xl border bg-white p-6">
						<div className="flex items-start justify-between gap-4">
							<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
								<FileText />
							</span>
							<Badge label={t(documentStatusKeys[document.status as DocumentStatus])} />
						</div>
						<h2 className="mt-5 break-all font-bold">{document.fileName}</h2>
						<div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
							<span>{t(documentTypeKeys[document.type] ?? "documents.type.other")}</span>
							<span>{formatSize(document.sizeBytes)}</span>
							<span>{document.mimeType}</span>
							<span>
								{t("documents.submittedAt", { date: formatDate(document.createdAt, locale) })}
							</span>
						</div>
						{document.feedback && (
							<p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6">
								{t("documents.feedback", { feedback: document.feedback })}
							</p>
						)}
						<div className="mt-5 flex flex-wrap gap-2">
							<Button
								variant="outline"
								disabled={downloadingId === document.id}
								onClick={() => downloadDocument(document.id, document.fileName)}
							>
								<Download />
								{t(downloadingId === document.id ? "documents.downloading" : "documents.download")}
							</Button>
							{canReviewDocument(document.status as DocumentStatus, isReviewer) && (
								<>
									<Button disabled={review.isPending} onClick={() => setApprovingId(document.id)}>
										<FileCheck2 />
										{t("documents.approve")}
									</Button>
									<Button
										variant="outline"
										disabled={review.isPending}
										onClick={() => setRejectingId(rejectingId === document.id ? null : document.id)}
									>
										{t("documents.reject")}
									</Button>
								</>
							)}
						</div>
						{rejectingId === document.id && (
							<form
								className="mt-4 grid gap-3 rounded-xl bg-muted p-4"
								onSubmit={(event) => {
									event.preventDefault();
									review.mutate({ id: document.id, decision: "rejected", feedback });
								}}
							>
								<label className="text-sm font-semibold">
									{t("documents.rejectionFeedback")}
									<textarea
										value={feedback}
										onChange={(event) => setFeedback(event.target.value)}
										minLength={3}
										maxLength={5000}
										required
										className="mt-2 min-h-24 w-full rounded-lg border bg-white p-3 font-normal"
									/>
								</label>
								<Button disabled={review.isPending || feedback.trim().length < 3}>
									{t("documents.confirmReview")}
								</Button>
							</form>
						)}
					</article>
				))}
			</div>
			<ConfirmationDialog
				open={Boolean(approvingId)}
				title={t("confirm.terminalTitle")}
				description={t("confirm.irreversible")}
				confirmLabel={t("common.confirm")}
				cancelLabel={t("common.cancel")}
				pending={review.isPending}
				onCancel={() => setApprovingId(null)}
				onConfirm={() => approvingId && review.mutate({ id: approvingId, decision: "approved" })}
			/>
			{downloadError && <Notice message={downloadError} error />}
			{review.isError && <Notice message={t("documents.reviewError")} error />}
		</div>
	);
}

async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok) throw new Error("ORGANIZATIONS_FAILED");
	return response.json();
}
function Badge({ label }: { label: string }) {
	return (
		<span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{label}</span>
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
function formatSize(bytes: number) {
	return bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
