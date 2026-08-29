import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import {
	canCancelRequest,
	canResubmitRequest,
	requestStatusLabels,
	requestStepLabels,
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
	const queryClient = useQueryClient();
	const [facultyId, setFacultyId] = useState("");
	const [majorId, setMajorId] = useState("");
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
	const action = useMutation({
		mutationFn: async ({ id, kind }: { id: string; kind: "cancel" | "resubmit" }) => {
			const endpoint = apiClient.api.v1["internship-requests"][":requestId"];
			const response =
				kind === "cancel"
					? await endpoint.cancel.$post({ param: { requestId: id } })
					: await endpoint.resubmit.$post({ param: { requestId: id } });
			if (!response.ok) throw new Error(`REQUEST_${response.status}`);
			return response.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["internship-requests", "me"] }),
	});

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		create.mutate(form, { onSuccess: () => form.reset() });
	}

	return (
		<section className="mt-12 border-t pt-10">
			<h2 className="text-2xl font-black">คำร้องฝึกงานที่หาสถานประกอบการเอง</h2>
			<p className="mt-2 text-muted-foreground">
				ส่งคำร้องให้อาจารย์ที่ปรึกษา หัวหน้าหลักสูตร และศูนย์สหกิจศึกษาตรวจตามลำดับ
			</p>
			<form
				className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"
				onSubmit={submit}
			>
				<Field label="ประเภทการฝึกงาน">
					<select name="type" required className={controlClass}>
						<option value="regular">ฝึกงานปกติ</option>
						<option value="cooperative">สหกิจศึกษา</option>
					</select>
				</Field>
				<Field label="คณะ">
				<select
					required
					className={controlClass}
					value={facultyId}
					onChange={(event) => {
						setFacultyId(event.target.value);
						setMajorId("");
					}}
					>
						<option value="">เลือกคณะ</option>
						{faculties.data?.data.map((faculty) => (
							<option key={faculty.id} value={faculty.id}>
								{faculty.name}
							</option>
						))}
					</select>
				</Field>
				<Field label="สาขาวิชา">
					<select
						required
						className={controlClass}
						value={majorId}
						onChange={(e) => setMajorId(e.target.value)}
					>
						<option value="">เลือกสาขาวิชา</option>
						{majors.data?.data.map((major) => (
							<option key={major.id} value={major.id}>
								{major.name}
							</option>
						))}
					</select>
				</Field>
				<Field label="อาจารย์ที่ปรึกษา">
					<select name="advisorUserId" required className={controlClass}>
						<option value="">เลือกอาจารย์</option>
						{advisors.data?.data.map((advisor) => (
							<option key={advisor.userId} value={advisor.userId}>
								{advisor.name}
							</option>
						))}
					</select>
				</Field>
				<Field label="ตำแหน่งที่ขอฝึก">
					<input
						name="positionTitle"
						minLength={2}
						maxLength={200}
						required
						className={controlClass}
					/>
				</Field>
				<Field label="ชื่อสถานประกอบการ">
					<input
						name="companyNameProposed"
						minLength={2}
						maxLength={200}
						required
						className={controlClass}
					/>
				</Field>
				<Field label="วันเริ่มฝึก">
					<input name="proposedStartDate" type="date" required className={controlClass} />
				</Field>
				<Field label="วันสิ้นสุด">
					<input name="proposedEndDate" type="date" required className={controlClass} />
				</Field>
				<Field label="ชื่อผู้ติดต่อ">
					<input
						name="companyContactName"
						minLength={2}
						maxLength={200}
						required
						className={controlClass}
					/>
				</Field>
				<Field label="อีเมลผู้ติดต่อ">
					<input name="companyContactEmail" type="email" required className={controlClass} />
				</Field>
				<Field label="โทรศัพท์ผู้ติดต่อ">
					<input
						name="companyContactPhone"
						minLength={8}
						maxLength={30}
						required
						className={controlClass}
					/>
				</Field>
				<Field label="รายละเอียดงาน" wide>
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
							ส่งคำร้องไม่สำเร็จ โปรดตรวจว่าสาขามีหัวหน้าหลักสูตรและข้อมูลครบถ้วน
						</p>
					)}
					<Button disabled={create.isPending || !majorId}>
						{create.isPending ? "กำลังส่ง..." : "ส่งคำร้อง"}
					</Button>
				</div>
			</form>
			<div className="mt-6 grid gap-4">
				{requests.data?.data.map((request) => {
					const status = request.status as InternshipRequestStatus;
					return (
						<RequestCard
							key={request.id}
							request={request}
							actions={
								<div className="flex gap-2">
									{canResubmitRequest(status) && (
										<Button
											size="sm"
											onClick={() => action.mutate({ id: request.id, kind: "resubmit" })}
										>
											ส่งตรวจอีกครั้ง
										</Button>
									)}
									{canCancelRequest(status) && (
										<Button
											size="sm"
											variant="outline"
											onClick={() => action.mutate({ id: request.id, kind: "cancel" })}
										>
											ยกเลิกคำร้อง
										</Button>
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

function RequestReviews() {
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
			<h2 className="text-2xl font-black">คำร้องที่รอตรวจสอบ</h2>
			{reviews.data?.data.length === 0 && (
				<p className="mt-5 rounded-2xl border bg-white p-8 text-center text-muted-foreground">
					ไม่มีคำร้องที่รอตรวจสอบ
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
										placeholder="หมายเหตุ (จำเป็นเมื่อไม่อนุมัติหรือขอแก้ไข)"
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
											อนุมัติ
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
											ขอแก้ไข
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
											ไม่อนุมัติ
										</Button>
									</div>
									{review.isError && (
										<p role="alert" className="text-sm text-destructive">
											ดำเนินการไม่สำเร็จ คำร้องอาจถูกตรวจไปแล้ว
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
							{request.companyNameProposed ?? "สถานประกอบการในระบบ"}
						</p>
					</div>
				</div>
				<span className="h-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
					{requestStatusLabels[status]}
				</span>
			</div>
			<p className="mt-4 text-sm text-muted-foreground">
				{formatDate(request.proposedStartDate)} – {formatDate(request.proposedEndDate)}
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
						{requestStepLabels[approval.step as InternshipRequestStep]}
					</span>
				))}
			</div>
			{request.revisionNote && (
				<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
					เหตุผลที่ขอแก้ไข: {request.revisionNote}
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
const formatDate = (value: string | Date) =>
	new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
