import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, ClipboardCheck, Clock3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

async function loadReviews() {
	const response = await apiClient.api.v1.onboarding.reviews.$get();
	if (!response.ok) throw new Error("REVIEWS_FAILED");
	return response.json();
}

export function OnboardingReviewPage() {
	const queryClient = useQueryClient();
	const reviews = useQuery({ queryKey: ["onboarding", "reviews"], queryFn: loadReviews });
	const [notes, setNotes] = useState<Record<string, string>>({});
	const [verified, setVerified] = useState<Record<string, boolean>>({});
	const review = useMutation({
		mutationFn: async ({
			id,
			decision,
		}: {
			id: string;
			decision: "approved" | "rejected" | "revision_requested";
		}) => {
			const response = await apiClient.api.v1.onboarding[":onboardingId"].review.$post({
				param: { onboardingId: id },
				json: { decision, note: notes[id] || undefined, documentsVerified: verified[id] },
			});
			if (!response.ok) throw new Error(`REVIEW_${response.status}`);
			return response.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding", "reviews"] }),
	});

	return (
		<div>
			<div>
				<p className="text-sm font-semibold text-primary">ACCESS REVIEWS</p>
				<h1 className="mt-2 text-3xl font-black">ตรวจสอบคำขอเข้าใช้งาน</h1>
				<p className="mt-2 text-muted-foreground">ระบบแสดงเฉพาะคำขอที่คุณมีสิทธิ์ตรวจสอบเท่านั้น</p>
			</div>
			{reviews.isLoading && <p className="mt-8 text-muted-foreground">กำลังโหลดคำขอ...</p>}
			{reviews.isError && (
				<p role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-destructive">
					ไม่สามารถโหลดคำขอได้
				</p>
			)}
			{reviews.data?.data.length === 0 && (
				<div className="mt-8 rounded-2xl border bg-white p-10 text-center">
					<ClipboardCheck className="mx-auto size-10 text-muted-foreground" />
					<h2 className="mt-4 font-bold">ไม่มีคำขอที่รอตรวจสอบ</h2>
				</div>
			)}
			<div className="mt-8 grid gap-5">
				{reviews.data?.data.map((item) => {
					const company = item.requestedRole === "company_admin";
					return (
						<article key={item.id} className="rounded-2xl border bg-white p-6">
							<div className="flex flex-col justify-between gap-4 sm:flex-row">
								<div className="flex gap-4">
									<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf3ff] text-primary">
										{company ? <Building2 /> : <Clock3 />}
									</span>
									<div>
										<h2 className="text-lg font-bold">{roleLabel(item.requestedRole)}</h2>
										<p className="mt-1 text-sm text-muted-foreground">
											ส่งเมื่อ{" "}
											{new Intl.DateTimeFormat("th-TH", {
												dateStyle: "medium",
												timeStyle: "short",
											}).format(new Date(item.submittedAt))}
										</p>
									</div>
								</div>
								<span className="h-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
									รอตรวจสอบ
								</span>
							</div>
							<dl className="mt-5 grid gap-3 rounded-xl bg-muted p-4 text-sm sm:grid-cols-2">
								{Object.entries(item.profileData).map(([key, value]) => (
									<div key={key}>
										<dt className="text-xs uppercase text-muted-foreground">{key}</dt>
										<dd className="mt-1 font-medium">{value}</dd>
									</div>
								))}
								{item.proposedOrganization &&
									Object.entries(item.proposedOrganization).map(([key, value]) => (
										<div key={key}>
											<dt className="text-xs uppercase text-muted-foreground">company.{key}</dt>
											<dd className="mt-1 font-medium">{value}</dd>
										</div>
									))}
							</dl>
							{company && (
								<label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
									<input
										type="checkbox"
										className="mt-0.5 size-4"
										checked={verified[item.id] ?? false}
										onChange={(event) =>
											setVerified((current) => ({ ...current, [item.id]: event.target.checked }))
										}
									/>
									<span>
										<strong>ยืนยันว่าตรวจเอกสารบริษัทแล้ว</strong>
										<span className="mt-1 block text-amber-800">
											อนุมัติไม่ได้จนกว่าเจ้าหน้าที่ CWIE จะตรวจหลักฐานจริงเรียบร้อย
										</span>
									</span>
								</label>
							)}
							<label className="mt-5 grid gap-2 text-sm font-semibold">
								หมายเหตุ
								<textarea
									className="min-h-24 rounded-xl border bg-background p-3 font-normal"
									value={notes[item.id] ?? ""}
									onChange={(event) =>
										setNotes((current) => ({ ...current, [item.id]: event.target.value }))
									}
								/>
							</label>
							{review.isError && (
								<p role="alert" className="mt-3 text-sm text-destructive">
									ดำเนินการไม่สำเร็จ กรุณาตรวจสิทธิ์หรือข้อมูลที่ต้องยืนยัน
								</p>
							)}
							<div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
								<Button
									variant="outline"
									disabled={!notes[item.id] || review.isPending}
									onClick={() => review.mutate({ id: item.id, decision: "revision_requested" })}
								>
									<Clock3 />
									ขอแก้ไข
								</Button>
								<Button
									variant="destructive"
									disabled={!notes[item.id] || review.isPending}
									onClick={() => review.mutate({ id: item.id, decision: "rejected" })}
								>
									<XCircle />
									ไม่อนุมัติ
								</Button>
								<Button
									disabled={(company && !verified[item.id]) || review.isPending}
									onClick={() => review.mutate({ id: item.id, decision: "approved" })}
								>
									<CheckCircle2 />
									อนุมัติ
								</Button>
							</div>
						</article>
					);
				})}
			</div>
		</div>
	);
}

function roleLabel(role: string) {
	return (
		(
			{
				student: "นักศึกษา",
				advisor: "อาจารย์ที่ปรึกษา",
				coordinator: "เจ้าหน้าที่/ผู้ประสานงาน",
				university_admin: "ผู้ดูแลมหาวิทยาลัย",
				company_admin: "ผู้แทนสถานประกอบการและบริษัทใหม่",
				supervisor: "พี่เลี้ยง/ผู้ควบคุมการฝึกงาน",
			} as Record<string, string>
		)[role] ?? role
	);
}
