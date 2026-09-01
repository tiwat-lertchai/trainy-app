import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import {
	canCancelRequest,
	canResubmitRequest,
	requestStatusKeys,
	requestStepKeys,
	type InternshipRequestStatus,
	type InternshipRequestStep,
} from "./internship-request-rules";

type Props = {
	organizationId?: string;
	role?: OrganizationRole;
};

export function InternshipRequestPanel({ organizationId, role }: Props) {
	if (role === "student") return <StudentRequests organizationId={organizationId} />;
	if (["advisor", "coordinator", "university_admin"].includes(role ?? ""))
		return <RequestReviews />;
	return null;
}

function StudentRequests({ organizationId }: { organizationId?: string }) {
	const { t } = useLanguage();
	const queryClient = useQueryClient();
	const [facultyId, setFacultyId] = useState("");
	const [majorId, setMajorId] = useState("");
	const [editingRequestId, setEditingRequestId] = useState<string>();
	const faculties = useQuery({
		queryKey: ["academic", "faculties", organizationId],
		queryFn: async () => {
			const response = await apiClient.api.v1.academic[":organizationId"].faculties.$get({
				param: { organizationId: organizationId! },
			});
			if (!response.ok) throw new Error("FACULTIES_FAILED");
			return response.json();
		},
		enabled: Boolean(organizationId),
	});
	const majors = useQuery({
		queryKey: ["academic", "majors", facultyId],
		queryFn: async () => {
			const response = await apiClient.api.v1.academic.faculties[":facultyId"].majors.$get({
				param: { facultyId },
			});
			if (!response.ok) throw new Error("MAJORS_FAILED");
			return response.json();
		},
		enabled: Boolean(facultyId),
	});
	const advisors = useQuery({
		queryKey: ["internship-requests", "advisor-options", organizationId],
		queryFn: async () => {
			const response = await apiClient.api.v1["internship-requests"].options.advisors.$get({
				query: { universityOrganizationId: organizationId! },
			});
			if (!response.ok) throw new Error("ADVISORS_FAILED");
			return response.json();
		},
		enabled: Boolean(organizationId),
	});
	const requests = useQuery({
		queryKey: ["internship-requests", "me"],
		queryFn: async () => {
			const response = await apiClient.api.v1["internship-requests"].me.$get();
			if (!response.ok) throw new Error("REQUESTS_FAILED");
			return response.json();
		},
	});
	const create = useMutation({
		mutationFn: async (form: HTMLFormElement) => {
			const data = new FormData(form);
			const response = await apiClient.api.v1["internship-requests"].$post({
				json: {
					universityOrganizationId: organizationId!,
					academicMajorId: majorId,
					type: String(data.get("type")) as "regular" | "cooperative",
					semester: Number(data.get("semester")),
					academicYear: Number(data.get("academicYear")),
					positionTitle: String(data.get("positionTitle")),
					description: String(data.get("description")),
					proposedStartDate: String(data.get("proposedStartDate")),
					proposedEndDate: String(data.get("proposedEndDate")),
					advisorUserId: String(data.get("advisorUserId")),
					companyNameProposed: String(data.get("companyNameProposed")),
					companyContactName: String(data.get("companyContactName")),
					companyContactEmail: String(data.get("companyContactEmail")),
					companyContactPhone: String(data.get("companyContactPhone")),
				},
			});
			if (!response.ok) throw new Error(`REQUEST_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["internship-requests", "me"] });
		},
	});
	const cancel = useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.api.v1["internship-requests"][":requestId"].cancel.$post({
				param: { requestId: id },
			});
			if (!response.ok) throw new Error(`REQUEST_${response.status}`);
			return response.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internship-requests", "me"] }),
	});
	const resubmit = useMutation({
		mutationFn: async ({ request, form }: { request: EditableRequest; form: HTMLFormElement }) => {
			const data = new FormData(form);
			const company = request.companyOrganizationId
				? { companyOrganizationId: request.companyOrganizationId }
				: {
						companyNameProposed: String(data.get("companyNameProposed")),
						companyContactName: String(data.get("companyContactName")),
						companyContactEmail: String(data.get("companyContactEmail")),
						companyContactPhone: String(data.get("companyContactPhone")),
					};
			const response = await apiClient.api.v1["internship-requests"][":requestId"].resubmit.$post({
				param: { requestId: request.id },
				json: {
					positionTitle: String(data.get("positionTitle")),
					description: String(data.get("description")),
					proposedStartDate: String(data.get("proposedStartDate")),
					proposedEndDate: String(data.get("proposedEndDate")),
					...company,
				},
			});
			if (!response.ok) throw new Error(`REQUEST_${response.status}`);
			return response.json();
		},
		onSuccess: async () => {
			setEditingRequestId(undefined);
			await queryClient.invalidateQueries({ queryKey: ["internship-requests", "me"] });
		},
	});

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		create.mutate(form, { onSuccess: () => form.reset() });
	}

	return (
		<section className="mt-12 border-t pt-10">
			<h2 className="text-2xl font-black">{t("internshipRequests.title")}</h2>
			<p className="mt-2 text-muted-foreground">{t("internshipRequests.description")}</p>
			<form
				className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"
				onSubmit={submit}
			>
				<Field label={t("internshipRequests.type")}>
					<select name="type" required className={controlClass}>
						<option value="regular">{t("internshipRequests.type.regular")}</option>
						<option value="cooperative">{t("internshipRequests.type.cooperative")}</option>
					</select>
				</Field>
				<Field label={t("internshipRequests.semester")}>
					<select name="semester" required className={controlClass} defaultValue="1">
						<option value="1">1</option>
						<option value="2">2</option>
						<option value="3">3</option>
					</select>
				</Field>
				<Field label={t("internshipRequests.academicYear")}>
					<input
						name="academicYear"
						type="number"
						min="2400"
						max="2800"
						defaultValue="2569"
						required
						className={controlClass}
					/>
				</Field>
				<Field label={t("internshipRequests.faculty")}>
					<select
						required
						className={controlClass}
						value={facultyId}
						onChange={(event) => {
							setFacultyId(event.target.value);
							setMajorId("");
						}}
					>
						<option value="">{t("internshipRequests.selectFaculty")}</option>
						{faculties.data?.data.map((faculty) => (
							<option key={faculty.id} value={faculty.id}>
								{faculty.name}
							</option>
						))}
					</select>
				</Field>
				<Field label={t("internshipRequests.major")}>
					<select
						required
						className={controlClass}
						value={majorId}
						onChange={(e) => setMajorId(e.target.value)}
					>
						<option value="">{t("internshipRequests.selectMajor")}</option>
						{majors.data?.data.map((major) => (
							<option key={major.id} value={major.id}>
								{major.name}
							</option>
						))}
					</select>
				</Field>
				<Field label={t("internshipRequests.advisor")}>
					<select name="advisorUserId" required className={controlClass}>
						<option value="">{t("internshipRequests.selectAdvisor")}</option>
						{advisors.data?.data.map((advisor) => (
							<option key={advisor.userId} value={advisor.userId}>
								{advisor.name}
							</option>
						))}
					</select>
				</Field>
				<Field label={t("internshipRequests.position")}>
					<input
						name="positionTitle"
						minLength={2}
						maxLength={200}
						required
						className={controlClass}
					/>
				</Field>
				<Field label={t("internshipRequests.companyName")}>
					<input
						name="companyNameProposed"
						minLength={2}
						maxLength={200}
						required
						className={controlClass}
					/>
				</Field>
				<Field label={t("internshipRequests.startDate")}>
					<input name="proposedStartDate" type="date" required className={controlClass} />
				</Field>
				<Field label={t("internshipRequests.endDate")}>
					<input name="proposedEndDate" type="date" required className={controlClass} />
				</Field>
				<Field label={t("internshipRequests.contactName")}>
					<input
						name="companyContactName"
						minLength={2}
						maxLength={200}
						required
						className={controlClass}
					/>
				</Field>
				<Field label={t("internshipRequests.contactEmail")}>
					<input name="companyContactEmail" type="email" required className={controlClass} />
				</Field>
				<Field label={t("internshipRequests.contactPhone")}>
					<input
						name="companyContactPhone"
						minLength={8}
						maxLength={30}
						required
						className={controlClass}
					/>
				</Field>
				<Field label={t("internshipRequests.details")} wide>
					<textarea
						name="description"
						minLength={10}
						maxLength={5000}
						required
						className={`${controlClass} min-h-28 py-3`}
					/>
				</Field>
				<div className="md:col-span-2">
					{create.isError && (
						<p role="alert" className="mb-3 text-sm text-destructive">
							{t("internshipRequests.createError")}
						</p>
					)}
					<Button disabled={create.isPending || !majorId}>
						{t(create.isPending ? "internshipRequests.sending" : "internshipRequests.send")}
					</Button>
				</div>
			</form>
			<div className="mt-6 grid gap-4">
				{requests.data?.data.map((request) => {
					const status = request.status as InternshipRequestStatus;
					const isEditing = editingRequestId === request.id;
					return (
						<RequestCard
							key={request.id}
							request={request}
							actions={
								isEditing ? (
									<RevisionForm
										request={request}
										isPending={resubmit.isPending}
										isError={resubmit.isError}
										onCancel={() => setEditingRequestId(undefined)}
										onSubmit={(form) => resubmit.mutate({ request, form })}
									/>
								) : (
									<div className="flex gap-2">
										{canResubmitRequest(status) && (
											<Button size="sm" onClick={() => setEditingRequestId(request.id)}>
												{t("internshipRequests.editResubmit")}
											</Button>
										)}
										{canCancelRequest(status) && (
											<Button
												size="sm"
												variant="outline"
												disabled={cancel.isPending}
												onClick={() => cancel.mutate(request.id)}
											>
												{t("internshipRequests.cancel")}
											</Button>
										)}
									</div>
								)
							}
						/>
					);
				})}
			</div>
		</section>
	);
}

type EditableRequest = {
	id: string;
	positionTitle: string;
	description: string;
	proposedStartDate: string | Date;
	proposedEndDate: string | Date;
	companyOrganizationId: string | null;
	companyNameProposed: string | null;
	companyContactName: string | null;
	companyContactEmail: string | null;
	companyContactPhone: string | null;
};

function RevisionForm({
	request,
	isPending,
	isError,
	onCancel,
	onSubmit,
}: {
	request: EditableRequest;
	isPending: boolean;
	isError: boolean;
	onCancel: () => void;
	onSubmit: (form: HTMLFormElement) => void;
}) {
	const { t } = useLanguage();
	return (
		<form
			className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-2"
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(event.currentTarget);
			}}
		>
			<Field label={t("internshipRequests.position")}>
				<input
					name="positionTitle"
					defaultValue={request.positionTitle}
					minLength={2}
					maxLength={200}
					required
					className={controlClass}
				/>
			</Field>
			{!request.companyOrganizationId && (
				<>
					<Field label={t("internshipRequests.companyName")}>
						<input
							name="companyNameProposed"
							defaultValue={request.companyNameProposed ?? ""}
							minLength={2}
							maxLength={200}
							required
							className={controlClass}
						/>
					</Field>
					<Field label={t("internshipRequests.contactName")}>
						<input
							name="companyContactName"
							defaultValue={request.companyContactName ?? ""}
							minLength={2}
							maxLength={200}
							required
							className={controlClass}
						/>
					</Field>
					<Field label={t("internshipRequests.contactEmail")}>
						<input
							name="companyContactEmail"
							type="email"
							defaultValue={request.companyContactEmail ?? ""}
							required
							className={controlClass}
						/>
					</Field>
					<Field label={t("internshipRequests.contactPhone")}>
						<input
							name="companyContactPhone"
							defaultValue={request.companyContactPhone ?? ""}
							minLength={8}
							maxLength={30}
							required
							className={controlClass}
						/>
					</Field>
				</>
			)}
			<Field label={t("internshipRequests.startDate")}>
				<input
					name="proposedStartDate"
					type="date"
					defaultValue={toDateInputValue(request.proposedStartDate)}
					required
					className={controlClass}
				/>
			</Field>
			<Field label={t("internshipRequests.endDate")}>
				<input
					name="proposedEndDate"
					type="date"
					defaultValue={toDateInputValue(request.proposedEndDate)}
					required
					className={controlClass}
				/>
			</Field>
			<Field label={t("internshipRequests.details")} wide>
				<textarea
					name="description"
					defaultValue={request.description}
					minLength={10}
					maxLength={5000}
					required
					className={`${controlClass} min-h-28 py-3`}
				/>
			</Field>
			<div className="flex flex-wrap gap-2 md:col-span-2">
				<Button disabled={isPending}>
					{t(isPending ? "internshipRequests.sending" : "internshipRequests.saveResubmit")}
				</Button>
				<Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
					{t("internshipRequests.cancelEdit")}
				</Button>
			</div>
			{isError && (
				<p role="alert" className="text-sm text-destructive md:col-span-2">
					{t("internshipRequests.resubmitError")}
				</p>
			)}
		</form>
	);
}

function RequestReviews() {
	const { t } = useLanguage();
	const queryClient = useQueryClient();
	const [notes, setNotes] = useState<Record<string, string>>({});
	const reviews = useQuery({
		queryKey: ["internship-requests", "reviews"],
		queryFn: async () => {
			const response = await apiClient.api.v1["internship-requests"].reviews.$get();
			if (!response.ok) throw new Error("REVIEWS_FAILED");
			return response.json();
		},
	});
	const review = useMutation({
		mutationFn: async ({
			id,
			step,
			decision,
		}: {
			id: string;
			step: InternshipRequestStep;
			decision: "approved" | "rejected" | "revision_requested";
		}) => {
			const response = await apiClient.api.v1["internship-requests"][":requestId"].steps[
				":step"
			].review.$post({
				param: { requestId: id, step },
				json: { decision, note: notes[id] || undefined },
			});
			if (!response.ok) throw new Error(`REVIEW_${response.status}`);
			return response.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["internship-requests", "reviews"] }),
	});
	return (
		<section className="mt-10">
			<h2 className="text-2xl font-black">{t("internshipRequests.pendingTitle")}</h2>
			{reviews.data?.data.length === 0 && (
				<p className="mt-5 rounded-2xl border bg-white p-8 text-center text-muted-foreground">
					{t("internshipRequests.pendingEmpty")}
				</p>
			)}
			<div className="mt-6 grid gap-4">
				{reviews.data?.data.map((request) => {
					const pending = request.approvals.find((item) => item.decision === "pending");
					if (!pending) return null;
					return (
						<RequestCard
							key={request.id}
							request={request}
							actions={
								<div className="grid gap-3">
									<textarea
										className={`${controlClass} min-h-20 py-2`}
										placeholder={t("internshipRequests.notePlaceholder")}
										value={notes[request.id] ?? ""}
										onChange={(event) =>
											setNotes((current) => ({ ...current, [request.id]: event.target.value }))
										}
									/>
									<div className="flex flex-wrap gap-2">
										<Button
											size="sm"
											disabled={review.isPending}
											onClick={() =>
												review.mutate({
													id: request.id,
													step: pending.step as InternshipRequestStep,
													decision: "approved",
												})
											}
										>
											{t("internshipRequests.approve")}
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={review.isPending || (notes[request.id]?.trim().length ?? 0) < 3}
											onClick={() =>
												review.mutate({
													id: request.id,
													step: pending.step as InternshipRequestStep,
													decision: "revision_requested",
												})
											}
										>
											{t("internshipRequests.requestRevision")}
										</Button>
										<Button
											size="sm"
											variant="destructive"
											disabled={review.isPending || (notes[request.id]?.trim().length ?? 0) < 3}
											onClick={() =>
												review.mutate({
													id: request.id,
													step: pending.step as InternshipRequestStep,
													decision: "rejected",
												})
											}
										>
											{t("internshipRequests.reject")}
										</Button>
									</div>
									{review.isError && (
										<p role="alert" className="text-sm text-destructive">
											{t("internshipRequests.reviewError")}
										</p>
									)}
								</div>
							}
						/>
					);
				})}
			</div>
		</section>
	);
}

function RequestCard({
	request,
	actions,
}: {
	request: {
		id: string;
		status: string;
		positionTitle: string;
		companyNameProposed: string | null;
		proposedStartDate: string | Date;
		proposedEndDate: string | Date;
		revisionNote: string | null;
		approvals: Array<{ id: string; step: string; decision: string }>;
	};
	actions?: React.ReactNode;
}) {
	const { locale, t } = useLanguage();
	const status = request.status as InternshipRequestStatus;
	return (
		<article className="rounded-2xl border bg-white p-6">
			<div className="flex flex-col justify-between gap-3 sm:flex-row">
				<div className="flex gap-3">
					<span className="grid size-10 place-items-center rounded-xl bg-[#edf3ff] text-primary">
						<Building2 className="size-5" />
					</span>
					<div>
						<h3 className="font-bold">{request.positionTitle}</h3>
						<p className="text-sm text-muted-foreground">
							{request.companyNameProposed ?? t("internshipRequests.systemCompany")}
						</p>
					</div>
				</div>
				<span className="h-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
					{t(requestStatusKeys[status])}
				</span>
			</div>
			<p className="mt-4 text-sm text-muted-foreground">
				{formatDate(request.proposedStartDate, locale)} –{" "}
				{formatDate(request.proposedEndDate, locale)}
			</p>
			<div className="mt-4 flex flex-wrap gap-2">
				{request.approvals.map((approval) => (
					<span
						key={approval.id}
						className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs"
					>
						<span>
							{approval.decision === "approved" ? (
								<CheckCircle2 className="size-3 text-emerald-600" />
							) : (
								<Clock3 className="size-3" />
							)}
						</span>
						{t(requestStepKeys[approval.step as InternshipRequestStep])}
					</span>
				))}
			</div>
			{request.revisionNote && (
				<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
					{t("internshipRequests.revisionReason", { reason: request.revisionNote })}
				</p>
			)}
			{actions && <div className="mt-5">{actions}</div>}
		</article>
	);
}

function Field({
	label,
	wide = false,
	children,
}: {
	label: string;
	wide?: boolean;
	children: React.ReactNode;
}) {
	return (
		<label className={`grid gap-2 text-sm font-semibold ${wide ? "md:col-span-2" : ""}`}>
			{label}
			{children}
		</label>
	);
}

const controlClass =
	"h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/10";
const formatDate = (value: string | Date, locale: string) =>
	new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
const toDateInputValue = (value: string | Date) => new Date(value).toISOString().slice(0, 10);
