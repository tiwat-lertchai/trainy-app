import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, FileText, HardDriveUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { canReviewDocument, documentStatusLabel, documentTypeLabel, type DocumentStatus } from "./document-rules";

const WORKSPACE_KEY = "trainy-workspace-id";

export function DocumentPage() {
	const queryClient = useQueryClient();
	const [selectedPlacement, setSelectedPlacement] = useState("");
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [feedback, setFeedback] = useState("");
	const organizations = useQuery({ queryKey: ["organizations"], queryFn: loadOrganizations });
	const context = organizations.data?.data.find((item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY)) ?? organizations.data?.data[0];
	const role = context?.membership.role;
	const isStudent = role === "student";
	const isReviewer = role === "advisor" || role === "supervisor";
	const placements = useQuery({
		queryKey: ["placements", isStudent ? "me" : context?.organization.id],
		queryFn: async () => {
			const response = isStudent ? await apiClient.api.v1.placements.me.$get() : await apiClient.api.v1.placements.organizations[":organizationId"].$get({ param: { organizationId: context!.organization.id } });
			if (!response.ok) throw new Error("PLACEMENTS_FAILED");
			return response.json();
		},
		enabled: Boolean(context),
	});
	const placementId = selectedPlacement || placements.data?.data[0]?.id || "";
	const documents = useQuery({
		queryKey: ["documents", placementId],
		queryFn: async () => { const response = await apiClient.api.v1.documents.placements[":placementId"].$get({ param: { placementId } }); if (!response.ok) throw new Error("DOCUMENTS_FAILED"); return response.json(); },
		enabled: Boolean(placementId),
	});
	const review = useMutation({
		mutationFn: async (input: { id: string; decision: "approved" | "rejected"; feedback?: string }) => { const response = await apiClient.api.v1.documents[":documentId"].review.$post({ param: { documentId: input.id }, json: { decision: input.decision, feedback: input.feedback } }); if (!response.ok) throw new Error(`DOCUMENT_${response.status}`); return response.json(); },
		onSuccess: async () => { setRejectingId(null); setFeedback(""); await queryClient.invalidateQueries({ queryKey: ["documents", placementId] }); },
	});

	return <div><p className="text-sm font-semibold text-primary">DOCUMENTS</p><h1 className="mt-2 text-3xl font-black">เอกสารการฝึกงาน</h1><p className="mt-2 text-muted-foreground">ติดตามเอกสารประกอบการฝึกงานและผลการตรวจจากผู้รับผิดชอบ</p>
		<label className="mt-6 grid max-w-xl gap-2 text-sm font-semibold">การฝึกงาน<select className="h-11 rounded-xl border bg-white px-3" value={placementId} onChange={(event) => { setSelectedPlacement(event.target.value); setRejectingId(null); }}><option value="" disabled>เลือกการฝึกงาน</option>{placements.data?.data.map((placement) => <option key={placement.id} value={placement.id}>{(placement as typeof placement & { internship?: { title: string } }).internship?.title ?? placement.id.slice(0, 8)}</option>)}</select></label>
		{isStudent && <div className="mt-6 flex gap-4 rounded-2xl border border-dashed bg-white p-6"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-primary"><HardDriveUpload /></span><div><h2 className="font-bold">การส่งไฟล์ยังไม่เปิดใช้งาน</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">ระบบกำลังเตรียมพื้นที่จัดเก็บไฟล์ที่ปลอดภัย ขณะนี้หน้านี้ใช้ดูสถานะและข้อเสนอแนะเท่านั้น เพื่อไม่สร้างรายการเอกสารที่ไม่มีไฟล์จริง</p></div></div>}
		{documents.isLoading && <div className="mt-8 h-36 animate-pulse rounded-2xl bg-muted" />}{documents.isError && <Notice message="โหลดรายการเอกสารไม่สำเร็จ" error />}{documents.data?.data.length === 0 && <Notice message="ยังไม่มีเอกสารสำหรับการฝึกงานนี้" />}
		<div className="mt-8 grid gap-4">{documents.data?.data.map((document) => <article key={document.id} className="rounded-2xl border bg-white p-6"><div className="flex items-start justify-between gap-4"><span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary"><FileText /></span><Badge status={document.status as DocumentStatus} /></div><h2 className="mt-5 break-all font-bold">{document.fileName}</h2><div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground"><span>{documentTypeLabel(document.type)}</span><span>{formatSize(document.sizeBytes)}</span><span>{document.mimeType}</span><span>ส่งเมื่อ {formatDate(document.createdAt)}</span></div>{document.feedback && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6">ข้อเสนอแนะ: {document.feedback}</p>}{canReviewDocument(document.status as DocumentStatus, isReviewer) && <div className="mt-5"><div className="flex flex-wrap gap-2"><Button disabled={review.isPending} onClick={() => review.mutate({ id: document.id, decision: "approved" })}><FileCheck2 />อนุมัติ</Button><Button variant="outline" disabled={review.isPending} onClick={() => setRejectingId(rejectingId === document.id ? null : document.id)}>ไม่ผ่านการตรวจ</Button></div>{rejectingId === document.id && <form className="mt-4 grid gap-3 rounded-xl bg-muted p-4" onSubmit={(event) => { event.preventDefault(); review.mutate({ id: document.id, decision: "rejected", feedback }); }}><label className="text-sm font-semibold">เหตุผลและสิ่งที่ต้องแก้ไข<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} minLength={3} maxLength={5000} required className="mt-2 min-h-24 w-full rounded-lg border bg-white p-3 font-normal" /></label><Button disabled={review.isPending || feedback.trim().length < 3}>ยืนยันผลการตรวจ</Button></form>}</div>}</article>)}</div>
		{review.isError && <Notice message="บันทึกผลการตรวจไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และสถานะล่าสุด" error />}</div>;
}

async function loadOrganizations() { const response = await apiClient.api.v1.organizations.$get(); if (!response.ok) throw new Error("ORGANIZATIONS_FAILED"); return response.json(); }
function Badge({ status }: { status: DocumentStatus }) { return <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{documentStatusLabel(status)}</span>; }
function Notice({ message, error = false }: { message: string; error?: boolean }) { return <div role={error ? "alert" : undefined} className={`mt-6 rounded-2xl border bg-white p-6 text-center text-sm ${error ? "border-destructive/20 text-destructive" : "text-muted-foreground"}`}>{message}</div>; }
function formatDate(value: string | Date) { return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value)); }
function formatSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
