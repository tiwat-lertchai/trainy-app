import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { requestLocation } from "./attendance-location";
import {
	adjustmentStatusLabel,
	attendanceStatusLabel,
	canCheckInOut,
	canManageSchedule,
	canReviewAdjustments,
	canViewUniversitySummary,
	formatNetMinutes,
} from "./attendance-rules";

const WORKSPACE_KEY = "trainy-workspace-id";
const weekdayLabels = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

type LocationInput = { location?: { latitude: number; longitude: number; accuracyMeters: number }; locationExceptionReason?: string };

async function captureEvidence(): Promise<LocationInput> {
	try {
		return { location: await requestLocation() };
	} catch {
		const reason = window.prompt("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาระบุเหตุผล (อย่างน้อย 5 ตัวอักษร)");
		return reason ? { locationExceptionReason: reason } : {};
	}
}

export function AttendancePage() {
	const queryClient = useQueryClient();
	const [selectedPlacement, setSelectedPlacement] = useState("");
	const [summaryRange, setSummaryRange] = useState({ from: "", to: "" });

	const organizations = useQuery({ queryKey: ["organizations"], queryFn: async () => { const r = await apiClient.api.v1.organizations.$get(); if (!r.ok) throw new Error(); return r.json(); } });
	const context = organizations.data?.data.find((item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY)) ?? organizations.data?.data[0];
	const organizationId = context?.organization.id;
	const role = context?.membership.role as OrganizationRole | undefined;
	const student = role === "student";

	const placements = useQuery({
		queryKey: ["placements", student ? "me" : organizationId],
		queryFn: async () => { const r = student ? await apiClient.api.v1.placements.me.$get() : await apiClient.api.v1.placements.organizations[":organizationId"].$get({ param: { organizationId: organizationId! } }); if (!r.ok) throw new Error(); return r.json(); },
		enabled: Boolean(role && (student || organizationId)),
	});
	const placementId = selectedPlacement || placements.data?.data[0]?.id || "";

	const attendance = useQuery({
		queryKey: ["attendance", placementId],
		queryFn: async () => { const r = await apiClient.api.v1.attendance[":placementId"].$get({ param: { placementId }, query: {} }); if (!r.ok) throw new Error(); return r.json(); },
		enabled: Boolean(placementId),
	});
	const schedule = useQuery({
		queryKey: ["attendance-schedule", placementId],
		queryFn: async () => { const r = await apiClient.api.v1.attendance[":placementId"].schedule.$get({ param: { placementId } }); if (!r.ok) throw new Error(); return r.json(); },
		enabled: Boolean(placementId),
	});
	const adjustments = useQuery({
		queryKey: ["attendance-adjustments", placementId],
		queryFn: async () => { const r = await apiClient.api.v1.attendance[":placementId"].adjustments.$get({ param: { placementId } }); if (!r.ok) throw new Error(); return r.json(); },
		enabled: Boolean(placementId) && canReviewAdjustments(role),
	});
	const summary = useQuery({
		queryKey: ["attendance-summary", organizationId, summaryRange.from, summaryRange.to],
		queryFn: async () => { const r = await apiClient.api.v1.attendance.organizations[":organizationId"].summary.$get({ param: { organizationId: organizationId! }, query: summaryRange }); if (!r.ok) throw new Error(); return r.json(); },
		enabled: Boolean(organizationId) && canViewUniversitySummary(role) && Boolean(summaryRange.from && summaryRange.to),
	});

	const invalidate = () => { queryClient.invalidateQueries({ queryKey: ["attendance", placementId] }); queryClient.invalidateQueries({ queryKey: ["attendance-adjustments", placementId] }); };

	const scheduleAction = useMutation({
		mutationFn: async (input: { days: Array<{ weekday: number }>; startMinute: number; endMinute: number; breakMinutes: number; graceMinutes: number; locationPolicy: "disabled" | "optional" | "required_onsite"; geofence?: { latitude: number; longitude: number; radiusMeters: number } }) => {
			const r = await apiClient.api.v1.attendance[":placementId"].schedule.$put({ param: { placementId }, json: { days: input.days.map((day) => ({ weekday: day.weekday, startMinute: input.startMinute, endMinute: input.endMinute, breakMinutes: input.breakMinutes, graceMinutes: input.graceMinutes })), timezone: "Asia/Bangkok", locationPolicy: input.locationPolicy, geofence: input.geofence } });
			if (!r.ok) throw new Error();
			return r.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance-schedule", placementId] }),
	});

	const attendanceAction = useMutation({
		mutationFn: async (input: { kind: "check-in" } | { kind: "check-out"; attendanceId: string } | { kind: "adjustment"; attendanceId: string; reason: string; proposedCheckOutAt?: string } | { kind: "review"; adjustmentId: string; decision: "approved" | "rejected"; note: string }) => {
			if (input.kind === "check-in") { const evidence = await captureEvidence(); const r = await apiClient.api.v1.attendance[":placementId"]["check-in"].$post({ param: { placementId }, json: evidence }); if (!r.ok) throw new Error(); return r.json(); }
			if (input.kind === "check-out") { const evidence = await captureEvidence(); const r = await apiClient.api.v1.attendance[":attendanceId"]["check-out"].$post({ param: { attendanceId: input.attendanceId }, json: evidence }); if (!r.ok) throw new Error(); return r.json(); }
			if (input.kind === "adjustment") { const r = await apiClient.api.v1.attendance[":attendanceId"].adjustments.$post({ param: { attendanceId: input.attendanceId }, json: { reason: input.reason, proposedCheckOutAt: input.proposedCheckOutAt } }); if (!r.ok) throw new Error(); return r.json(); }
			const r = await apiClient.api.v1.attendance.adjustments[":adjustmentId"].review.$post({ param: { adjustmentId: input.adjustmentId }, json: { decision: input.decision, note: input.note } });
			if (!r.ok) throw new Error();
			return r.json();
		},
		onSuccess: invalidate,
	});

	const todayRecord = attendance.data?.data.find((record) => !record.checkedOutAt);
	const activePolicy = schedule.data?.data[0]?.locationPolicy;

	function submitSchedule(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const weekdays = [1, 2, 3, 4, 5].filter((day) => data.get(`day-${day}`));
		const locationPolicy = String(data.get("locationPolicy")) as "disabled" | "optional" | "required_onsite";
		const geofence = locationPolicy === "required_onsite" ? { latitude: Number(data.get("latitude")), longitude: Number(data.get("longitude")), radiusMeters: Number(data.get("radiusMeters")) } : undefined;
		scheduleAction.mutate({ days: weekdays.map((weekday) => ({ weekday })), startMinute: toMinutes(String(data.get("start"))), endMinute: toMinutes(String(data.get("end"))), breakMinutes: Number(data.get("breakMinutes")), graceMinutes: Number(data.get("graceMinutes")), locationPolicy, geofence });
	}

	function requestAdjustment(attendanceId: string) {
		const reason = window.prompt("เหตุผลที่ขอแก้ไขเวลา (อย่างน้อย 10 ตัวอักษร)");
		if (reason) attendanceAction.mutate({ kind: "adjustment", attendanceId, reason });
	}

	function reviewAdjustment(adjustmentId: string, decision: "approved" | "rejected") {
		const note = window.prompt(decision === "approved" ? "หมายเหตุการอนุมัติ" : "เหตุผลที่ปฏิเสธ");
		if (note) attendanceAction.mutate({ kind: "review", adjustmentId, decision, note });
	}

	return (
		<div>
			<p className="text-sm font-semibold text-primary">ATTENDANCE</p>
			<h1 className="mt-2 text-3xl font-black">การเข้างานและตำแหน่งที่ตั้ง</h1>
			<p className="mt-2 text-muted-foreground">เช็คอิน เช็คเอาท์ และติดตามชั่วโมงการฝึกงาน</p>

			{placements.data && placements.data.data.length > 1 && (
				<label className="mt-6 grid max-w-xl gap-2 text-sm font-semibold">การฝึกงาน
					<select className="h-11 rounded-xl border bg-white px-3" value={placementId} onChange={(event) => setSelectedPlacement(event.target.value)}>
						{placements.data.data.map((item) => <option key={item.id} value={item.id}>{(item as typeof item & { internship?: { title: string } }).internship?.title ?? item.id.slice(0, 8)}</option>)}
					</select>
				</label>
			)}

			{canManageSchedule(role) && placementId && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">กำหนดตารางเวลาทำงาน</h2>
					<form className="mt-4 grid gap-4" onSubmit={submitSchedule}>
						<div className="flex flex-wrap gap-4">{[1, 2, 3, 4, 5].map((day) => <label key={day} className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={`day-${day}`} defaultChecked className="size-4" />{weekdayLabels[day]}</label>)}</div>
						<div className="grid gap-4 sm:grid-cols-4">
							<TimeField name="start" label="เวลาเริ่ม" defaultValue="08:00" />
							<TimeField name="end" label="เวลาเลิก" defaultValue="17:00" />
							<NumberField name="breakMinutes" label="พักเที่ยง (นาที)" defaultValue={60} />
							<NumberField name="graceMinutes" label="ผ่อนผันสาย (นาที)" defaultValue={10} />
						</div>
						<label className="grid gap-2 text-sm font-semibold sm:max-w-xs">นโยบายตำแหน่งที่ตั้ง
							<select name="locationPolicy" className="h-11 rounded-xl border bg-white px-3 font-normal" defaultValue="optional">
								<option value="disabled">ไม่ตรวจสอบตำแหน่ง</option>
								<option value="optional">ตรวจสอบแบบไม่บังคับ</option>
								<option value="required_onsite">ต้องอยู่ในพื้นที่ที่กำหนด</option>
							</select>
						</label>
						<div className="grid gap-4 sm:grid-cols-3">
							<NumberField name="latitude" label="ละติจูดสถานที่ทำงาน" step="any" />
							<NumberField name="longitude" label="ลองจิจูดสถานที่ทำงาน" step="any" />
							<NumberField name="radiusMeters" label="รัศมี (เมตร)" defaultValue={200} />
						</div>
						<Button className="w-fit" disabled={scheduleAction.isPending}>บันทึกตารางเวลา</Button>
						{scheduleAction.isError && <p role="alert" className="text-sm text-destructive">บันทึกตารางเวลาไม่สำเร็จ</p>}
					</form>
				</section>
			)}

			{canCheckInOut(role) && placementId && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">เช็คอิน / เช็คเอาท์วันนี้</h2>
					{activePolicy === "required_onsite" && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" />ตำแหน่งของคุณต้องอยู่ในพื้นที่ที่กำหนด</p>}
					<div className="mt-4 flex gap-3">
						{!todayRecord && <Button disabled={attendanceAction.isPending} onClick={() => attendanceAction.mutate({ kind: "check-in" })}>เช็คอิน</Button>}
						{todayRecord && <Button disabled={attendanceAction.isPending} onClick={() => attendanceAction.mutate({ kind: "check-out", attendanceId: todayRecord.id })}>เช็คเอาท์</Button>}
					</div>
					{attendanceAction.isError && <p role="alert" className="mt-3 text-sm text-destructive">ดำเนินการไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และตำแหน่งที่ตั้ง</p>}
				</section>
			)}

			<section className="mt-8">
				<h2 className="font-bold">ประวัติการเข้างาน</h2>
				{attendance.isLoading && <div className="mt-4 h-32 animate-pulse rounded-2xl bg-muted" />}
				{attendance.data?.data.length === 0 && <div className="mt-4 rounded-2xl border bg-white p-10 text-center text-muted-foreground">ยังไม่มีประวัติการเข้างาน</div>}
				<div className="mt-4 grid gap-4">
					{attendance.data?.data.map((record) => (
						<article key={record.id} className="rounded-2xl border bg-white p-6">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<span className="flex items-center gap-2 font-semibold"><CalendarClock className="size-4" />{record.workDate}</span>
								<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{attendanceStatusLabel(record.status)}</span>
							</div>
							<div className="mt-4 flex flex-wrap gap-5 text-sm text-muted-foreground">
								<span className="flex items-center gap-2"><Clock3 className="size-4" />เข้า {formatTime(record.checkedInAt)}{record.checkedOutAt ? ` – ออก ${formatTime(record.checkedOutAt)}` : ""}</span>
								<span>สุทธิ {formatNetMinutes(record.netMinutes)}</span>
							</div>
							{student && <Button variant="outline" className="mt-4" disabled={attendanceAction.isPending} onClick={() => requestAdjustment(record.id)}>ขอแก้ไขเวลา</Button>}
						</article>
					))}
				</div>
			</section>

			{canReviewAdjustments(role) && placementId && (
				<section className="mt-8">
					<h2 className="font-bold">คำขอแก้ไขเวลาที่รอตรวจสอบ</h2>
					{adjustments.data?.data.length === 0 && <p className="mt-3 text-sm text-muted-foreground">ไม่มีคำขอที่รอตรวจสอบ</p>}
					<div className="mt-4 grid gap-4">
						{adjustments.data?.data.map((item) => (
							<article key={item.id} className="rounded-2xl border bg-white p-6">
								<p className="font-semibold">{adjustmentStatusLabel(item.status)}</p>
								<p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
								{item.proposedCheckOutAt && <p className="mt-2 text-sm">เวลาออกที่เสนอ: {formatTime(item.proposedCheckOutAt)}</p>}
								<div className="mt-4 flex gap-2">
									<Button disabled={attendanceAction.isPending} onClick={() => reviewAdjustment(item.id, "approved")}>อนุมัติ</Button>
									<Button variant="outline" disabled={attendanceAction.isPending} onClick={() => reviewAdjustment(item.id, "rejected")}>ปฏิเสธ</Button>
								</div>
							</article>
						))}
					</div>
				</section>
			)}

			{canViewUniversitySummary(role) && organizationId && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">สรุปภาพรวมมหาวิทยาลัย</h2>
					<div className="mt-4 flex flex-wrap items-end gap-4">
						<label className="grid gap-2 text-sm font-semibold">จากวันที่<input type="date" className="h-11 rounded-xl border px-3 font-normal" value={summaryRange.from} onChange={(event) => setSummaryRange((prev) => ({ ...prev, from: event.target.value }))} /></label>
						<label className="grid gap-2 text-sm font-semibold">ถึงวันที่<input type="date" className="h-11 rounded-xl border px-3 font-normal" value={summaryRange.to} onChange={(event) => setSummaryRange((prev) => ({ ...prev, to: event.target.value }))} /></label>
					</div>
					{summary.data && (
						<div className="mt-5 grid gap-4 sm:grid-cols-4">
							<Stat label="บันทึกทั้งหมด" value={summary.data.data.totalRecords} />
							<Stat label="ครบชั่วโมง" value={summary.data.data.completedRecords} />
							<Stat label="ไม่ครบชั่วโมง" value={summary.data.data.incompleteRecords} />
							<Stat label="รวมนาทีสุทธิ" value={summary.data.data.totalNetMinutes} />
						</div>
					)}
				</section>
			)}
		</div>
	);
}

function TimeField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) { return <label className="grid gap-2 text-sm font-semibold">{label}<input type="time" name={name} defaultValue={defaultValue} required className="h-11 rounded-xl border px-3 font-normal" /></label>; }
function NumberField({ name, label, defaultValue, step }: { name: string; label: string; defaultValue?: number; step?: string }) { return <label className="grid gap-2 text-sm font-semibold">{label}<input type="number" name={name} defaultValue={defaultValue} step={step} className="h-11 rounded-xl border px-3 font-normal" /></label>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-muted p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>; }
function formatTime(value: string | Date) { return new Intl.DateTimeFormat("th-TH", { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value)); }
function toMinutes(value: string) { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; }
