import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import { apiClient } from "@/lib/api-client";
import type { OrganizationRole } from "@/features/organizations/role-navigation";
import { requestLocation } from "./attendance-location";
import {
	adjustmentStatusKeys,
	attendanceStatusKeys,
	canCheckInOut,
	canManageSchedule,
	canReviewAdjustments,
	canViewUniversitySummary,
	formatNetMinutes,
} from "./attendance-rules";

const WORKSPACE_KEY = "trainy-workspace-id";
const weekdayKeys: MessageKey[] = [
	"attendance.weekday.sun",
	"attendance.weekday.mon",
	"attendance.weekday.tue",
	"attendance.weekday.wed",
	"attendance.weekday.thu",
	"attendance.weekday.fri",
	"attendance.weekday.sat",
];

type LocationInput = {
	location?: { latitude: number; longitude: number; accuracyMeters: number };
	locationExceptionReason?: string;
};

async function captureEvidence(locationPrompt: string): Promise<LocationInput> {
	try {
		return { location: await requestLocation() };
	} catch {
		const reason = window.prompt(locationPrompt);
		return reason ? { locationExceptionReason: reason } : {};
	}
}

export function AttendancePage() {
	const { locale, t } = useLanguage();
	const queryClient = useQueryClient();
	const [selectedPlacement, setSelectedPlacement] = useState("");
	const [summaryRange, setSummaryRange] = useState({ from: "", to: "" });
	const [offsite, setOffsite] = useState(false);
	const [offsiteDestination, setOffsiteDestination] = useState("");
	const [offsiteReason, setOffsiteReason] = useState("");

	const organizations = useQuery({
		queryKey: ["organizations"],
		queryFn: async () => {
			const r = await apiClient.api.v1.organizations.$get();
			if (!r.ok) throw new Error();
			return r.json();
		},
	});
	const context =
		organizations.data?.data.find(
			(item) => item.organization.id === localStorage.getItem(WORKSPACE_KEY),
		) ?? organizations.data?.data[0];
	const organizationId = context?.organization.id;
	const role = context?.membership.role as OrganizationRole | undefined;
	const student = role === "student";

	const placements = useQuery({
		queryKey: ["placements", student ? "me" : organizationId],
		queryFn: async () => {
			const r = student
				? await apiClient.api.v1.placements.me.$get()
				: await apiClient.api.v1.placements.organizations[":organizationId"].$get({
						param: { organizationId: organizationId! },
					});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(role && (student || organizationId)),
	});
	const placementId = selectedPlacement || placements.data?.data[0]?.id || "";

	const attendance = useQuery({
		queryKey: ["attendance", placementId],
		queryFn: async () => {
			const r = await apiClient.api.v1.attendance[":placementId"].$get({
				param: { placementId },
				query: {},
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(placementId),
	});
	const schedule = useQuery({
		queryKey: ["attendance-schedule", placementId],
		queryFn: async () => {
			const r = await apiClient.api.v1.attendance[":placementId"].schedule.$get({
				param: { placementId },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(placementId),
	});
	const adjustments = useQuery({
		queryKey: ["attendance-adjustments", placementId],
		queryFn: async () => {
			const r = await apiClient.api.v1.attendance[":placementId"].adjustments.$get({
				param: { placementId },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(placementId) && canReviewAdjustments(role),
	});
	const leaves = useQuery({
		queryKey: ["attendance-leaves", placementId],
		queryFn: async () => {
			const r = await apiClient.api.v1.attendance[":placementId"].leaves.$get({
				param: { placementId },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(placementId),
	});
	const summary = useQuery({
		queryKey: ["attendance-summary", organizationId, summaryRange.from, summaryRange.to],
		queryFn: async () => {
			const r = await apiClient.api.v1.attendance.organizations[":organizationId"].summary.$get({
				param: { organizationId: organizationId! },
				query: summaryRange,
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled:
			Boolean(organizationId) &&
			canViewUniversitySummary(role) &&
			Boolean(summaryRange.from && summaryRange.to),
	});

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["attendance", placementId] });
		queryClient.invalidateQueries({ queryKey: ["attendance-adjustments", placementId] });
		queryClient.invalidateQueries({ queryKey: ["attendance-leaves", placementId] });
	};

	const scheduleAction = useMutation({
		mutationFn: async (input: {
			days: Array<{ weekday: number }>;
			startMinute: number;
			endMinute: number;
			breakMinutes: number;
			graceMinutes: number;
			locationPolicy: "disabled" | "optional" | "required_onsite";
			geofence?: { latitude: number; longitude: number; radiusMeters: number };
		}) => {
			const r = await apiClient.api.v1.attendance[":placementId"].schedule.$put({
				param: { placementId },
				json: {
					days: input.days.map((day) => ({
						weekday: day.weekday,
						startMinute: input.startMinute,
						endMinute: input.endMinute,
						breakMinutes: input.breakMinutes,
						graceMinutes: input.graceMinutes,
					})),
					timezone: "Asia/Bangkok",
					locationPolicy: input.locationPolicy,
					geofence: input.geofence,
				},
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["attendance-schedule", placementId] }),
	});

	const attendanceAction = useMutation({
		mutationFn: async (
			input:
				| { kind: "check-in"; offsiteDestination?: string; offsiteReason?: string }
				| { kind: "leave"; leaveDate: string; reason: string }
				| { kind: "check-out"; attendanceId: string }
				| { kind: "adjustment"; attendanceId: string; reason: string; proposedCheckOutAt?: string }
				| { kind: "review"; adjustmentId: string; decision: "approved" | "rejected"; note: string },
		) => {
			if (input.kind === "check-in") {
				const evidence = await captureEvidence(t("attendance.locationPrompt"));
				const r = await apiClient.api.v1.attendance[":placementId"]["check-in"].$post({
					param: { placementId },
					json: {
						...evidence,
						offsiteDestination: input.offsiteDestination,
						locationExceptionReason: input.offsiteReason ?? evidence.locationExceptionReason,
					},
				});
				if (!r.ok) throw new Error();
				return r.json();
			}
			if (input.kind === "leave") {
				const r = await apiClient.api.v1.attendance[":placementId"].leaves.$post({
					param: { placementId },
					json: { leaveDate: input.leaveDate, reason: input.reason },
				});
				if (!r.ok) throw new Error();
				return r.json();
			}
			if (input.kind === "check-out") {
				const evidence = await captureEvidence(t("attendance.locationPrompt"));
				const r = await apiClient.api.v1.attendance[":attendanceId"]["check-out"].$post({
					param: { attendanceId: input.attendanceId },
					json: evidence,
				});
				if (!r.ok) throw new Error();
				return r.json();
			}
			if (input.kind === "adjustment") {
				const r = await apiClient.api.v1.attendance[":attendanceId"].adjustments.$post({
					param: { attendanceId: input.attendanceId },
					json: { reason: input.reason, proposedCheckOutAt: input.proposedCheckOutAt },
				});
				if (!r.ok) throw new Error();
				return r.json();
			}
			const r = await apiClient.api.v1.attendance.adjustments[":adjustmentId"].review.$post({
				param: { adjustmentId: input.adjustmentId },
				json: { decision: input.decision, note: input.note },
			});
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
		const locationPolicy = String(data.get("locationPolicy")) as
			"disabled" | "optional" | "required_onsite";
		const geofence =
			locationPolicy === "required_onsite"
				? {
						latitude: Number(data.get("latitude")),
						longitude: Number(data.get("longitude")),
						radiusMeters: Number(data.get("radiusMeters")),
					}
				: undefined;
		scheduleAction.mutate({
			days: weekdays.map((weekday) => ({ weekday })),
			startMinute: toMinutes(String(data.get("start"))),
			endMinute: toMinutes(String(data.get("end"))),
			breakMinutes: Number(data.get("breakMinutes")),
			graceMinutes: Number(data.get("graceMinutes")),
			locationPolicy,
			geofence,
		});
	}

	function submitLeave(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		attendanceAction.mutate(
			{
				kind: "leave",
				leaveDate: String(data.get("leaveDate")),
				reason: String(data.get("reason")),
			},
			{ onSuccess: () => form.reset() },
		);
	}

	function requestAdjustment(attendanceId: string) {
		const reason = window.prompt(t("attendance.adjustmentPrompt"));
		if (reason) attendanceAction.mutate({ kind: "adjustment", attendanceId, reason });
	}

	function reviewAdjustment(adjustmentId: string, decision: "approved" | "rejected") {
		const note = window.prompt(
			t(decision === "approved" ? "attendance.approvalNote" : "attendance.rejectionReason"),
		);
		if (note) attendanceAction.mutate({ kind: "review", adjustmentId, decision, note });
	}

	return (
		<div>
			<p className="text-sm font-semibold text-primary">{t("attendance.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("attendance.title")}</h1>
			<p className="mt-2 text-muted-foreground">{t("attendance.description")}</p>

			{placements.data && placements.data.data.length > 1 && (
				<label className="mt-6 grid max-w-xl gap-2 text-sm font-semibold">
					{t("attendance.placement")}
					<select
						className="h-11 rounded-xl border bg-white px-3"
						value={placementId}
						onChange={(event) => setSelectedPlacement(event.target.value)}
					>
						{placements.data.data.map((item) => (
							<option key={item.id} value={item.id}>
								{(item as typeof item & { internship?: { title: string } }).internship?.title ??
									item.id.slice(0, 8)}
							</option>
						))}
					</select>
				</label>
			)}

			{canManageSchedule(role) && placementId && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">{t("attendance.schedule")}</h2>
					<form className="mt-4 grid gap-4" onSubmit={submitSchedule}>
						<div className="flex flex-wrap gap-4">
							{[1, 2, 3, 4, 5].map((day) => (
								<label key={day} className="flex items-center gap-2 text-sm font-medium">
									<input type="checkbox" name={`day-${day}`} defaultChecked className="size-4" />
									{t(weekdayKeys[day])}
								</label>
							))}
						</div>
						<div className="grid gap-4 sm:grid-cols-4">
							<TimeField name="start" label={t("attendance.startTime")} defaultValue="08:00" />
							<TimeField name="end" label={t("attendance.endTime")} defaultValue="17:00" />
							<NumberField
								name="breakMinutes"
								label={t("attendance.breakMinutes")}
								defaultValue={60}
							/>
							<NumberField
								name="graceMinutes"
								label={t("attendance.graceMinutes")}
								defaultValue={10}
							/>
						</div>
						<label className="grid gap-2 text-sm font-semibold sm:max-w-xs">
							{t("attendance.locationPolicy")}
							<select
								name="locationPolicy"
								className="h-11 rounded-xl border bg-white px-3 font-normal"
								defaultValue="optional"
							>
								<option value="disabled">{t("attendance.location.disabled")}</option>
								<option value="optional">{t("attendance.location.optional")}</option>
								<option value="required_onsite">{t("attendance.location.required")}</option>
							</select>
						</label>
						<div className="grid gap-4 sm:grid-cols-3">
							<NumberField name="latitude" label={t("attendance.latitude")} step="any" />
							<NumberField name="longitude" label={t("attendance.longitude")} step="any" />
							<NumberField name="radiusMeters" label={t("attendance.radius")} defaultValue={200} />
						</div>
						<Button className="w-fit" disabled={scheduleAction.isPending}>
							{t("attendance.saveSchedule")}
						</Button>
						{scheduleAction.isError && (
							<p role="alert" className="text-sm text-destructive">
								{t("attendance.scheduleError")}
							</p>
						)}
					</form>
				</section>
			)}

			{canCheckInOut(role) && placementId && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">{t("attendance.today")}</h2>
					{activePolicy === "required_onsite" && (
						<p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
							<MapPin className="size-4" />
							{t("attendance.onsiteRequired")}
						</p>
					)}
					<div className="mt-4 flex gap-3">
						{!todayRecord && (
							<Button
								disabled={attendanceAction.isPending}
								onClick={() =>
									attendanceAction.mutate({
										kind: "check-in",
										offsiteDestination: offsite ? offsiteDestination : undefined,
										offsiteReason: offsite ? offsiteReason : undefined,
									})
								}
							>
								{t("attendance.checkIn")}
							</Button>
						)}
						{todayRecord && (
							<Button
								disabled={attendanceAction.isPending}
								onClick={() =>
									attendanceAction.mutate({ kind: "check-out", attendanceId: todayRecord.id })
								}
							>
								{t("attendance.checkOut")}
							</Button>
						)}
					</div>
					{!todayRecord && (
						<div className="mt-4 grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2">
							<label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
								<input
									type="checkbox"
									checked={offsite}
									onChange={(event) => setOffsite(event.target.checked)}
								/>
								Check in at an off-site work location
							</label>
							{offsite && (
								<>
									<input
										className="h-10 rounded-xl border px-3"
										placeholder="Destination"
										value={offsiteDestination}
										onChange={(event) => setOffsiteDestination(event.target.value)}
									/>
									<input
										className="h-10 rounded-xl border px-3"
										placeholder="Reason"
										value={offsiteReason}
										onChange={(event) => setOffsiteReason(event.target.value)}
									/>
								</>
							)}
						</div>
					)}
					{attendanceAction.isError && (
						<p role="alert" className="mt-3 text-sm text-destructive">
							{t("attendance.actionError")}
						</p>
					)}
				</section>
			)}

			{canCheckInOut(role) && placementId && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">Leave requests</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Record-only leave; approved leave does not add or subtract attendance hours.
					</p>
					<form className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr_auto]" onSubmit={submitLeave}>
						<input name="leaveDate" type="date" required className="h-11 rounded-xl border px-3" />
						<input
							name="reason"
							required
							minLength={5}
							maxLength={2000}
							placeholder="Reason"
							className="h-11 rounded-xl border px-3"
						/>
						<Button disabled={attendanceAction.isPending}>Request leave</Button>
					</form>
					<div className="mt-4 grid gap-2">
						{leaves.data?.data.map((leave) => (
							<div
								key={leave.id}
								className="flex justify-between rounded-xl bg-muted px-4 py-3 text-sm"
							>
								<span>
									{leave.leaveDate} — {leave.reason}
								</span>
								<strong>{leave.status}</strong>
							</div>
						))}
					</div>
				</section>
			)}

			<section className="mt-8">
				<h2 className="font-bold">{t("attendance.history")}</h2>
				{attendance.isLoading && <div className="mt-4 h-32 animate-pulse rounded-2xl bg-muted" />}
				{attendance.data?.data.length === 0 && (
					<div className="mt-4 rounded-2xl border bg-white p-10 text-center text-muted-foreground">
						{t("attendance.empty")}
					</div>
				)}
				<div className="mt-4 grid gap-4">
					{attendance.data?.data.map((record) => (
						<article key={record.id} className="rounded-2xl border bg-white p-6">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<span className="flex items-center gap-2 font-semibold">
									<CalendarClock className="size-4" />
									{record.workDate}
								</span>
								<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
									{attendanceStatusKeys[record.status]
										? t(attendanceStatusKeys[record.status])
										: record.status}
								</span>
							</div>
							<div className="mt-4 flex flex-wrap gap-5 text-sm text-muted-foreground">
								<span className="flex items-center gap-2">
									<Clock3 className="size-4" />
									{t("attendance.inAt", { time: formatTime(record.checkedInAt, locale) })}
									{record.checkedOutAt
										? ` – ${t("attendance.outAt", { time: formatTime(record.checkedOutAt, locale) })}`
										: ""}
								</span>
								<span>
									{t("attendance.net", {
										duration: formatNetMinutes(
											record.netMinutes,
											t("attendance.hourShort"),
											t("attendance.minuteShort"),
										),
									})}
								</span>
							</div>
							{student && (
								<Button
									variant="outline"
									className="mt-4"
									disabled={attendanceAction.isPending}
									onClick={() => requestAdjustment(record.id)}
								>
									{t("attendance.requestAdjustment")}
								</Button>
							)}
						</article>
					))}
				</div>
			</section>

			{canReviewAdjustments(role) && placementId && (
				<section className="mt-8">
					<h2 className="font-bold">{t("attendance.pendingAdjustments")}</h2>
					{adjustments.data?.data.length === 0 && (
						<p className="mt-3 text-sm text-muted-foreground">{t("attendance.noAdjustments")}</p>
					)}
					<div className="mt-4 grid gap-4">
						{adjustments.data?.data.map((item) => (
							<article key={item.id} className="rounded-2xl border bg-white p-6">
								<p className="font-semibold">
									{adjustmentStatusKeys[item.status]
										? t(adjustmentStatusKeys[item.status])
										: item.status}
								</p>
								<p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
								{item.proposedCheckOutAt && (
									<p className="mt-2 text-sm">
										{t("attendance.proposedCheckout", {
											time: formatTime(item.proposedCheckOutAt, locale),
										})}
									</p>
								)}
								<div className="mt-4 flex gap-2">
									<Button
										disabled={attendanceAction.isPending}
										onClick={() => reviewAdjustment(item.id, "approved")}
									>
										{t("attendance.approve")}
									</Button>
									<Button
										variant="outline"
										disabled={attendanceAction.isPending}
										onClick={() => reviewAdjustment(item.id, "rejected")}
									>
										{t("attendance.reject")}
									</Button>
								</div>
							</article>
						))}
					</div>
				</section>
			)}

			{canViewUniversitySummary(role) && organizationId && (
				<section className="mt-8 rounded-2xl border bg-white p-6">
					<h2 className="font-bold">{t("attendance.universitySummary")}</h2>
					<div className="mt-4 flex flex-wrap items-end gap-4">
						<label className="grid gap-2 text-sm font-semibold">
							{t("attendance.fromDate")}
							<input
								type="date"
								className="h-11 rounded-xl border px-3 font-normal"
								value={summaryRange.from}
								onChange={(event) =>
									setSummaryRange((prev) => ({ ...prev, from: event.target.value }))
								}
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold">
							{t("attendance.toDate")}
							<input
								type="date"
								className="h-11 rounded-xl border px-3 font-normal"
								value={summaryRange.to}
								onChange={(event) =>
									setSummaryRange((prev) => ({ ...prev, to: event.target.value }))
								}
							/>
						</label>
					</div>
					{summary.data && (
						<div className="mt-5 grid gap-4 sm:grid-cols-4">
							<Stat label={t("attendance.totalRecords")} value={summary.data.data.totalRecords} />
							<Stat
								label={t("attendance.completedRecords")}
								value={summary.data.data.completedRecords}
							/>
							<Stat
								label={t("attendance.incompleteRecords")}
								value={summary.data.data.incompleteRecords}
							/>
							<Stat
								label={t("attendance.totalNetMinutes")}
								value={summary.data.data.totalNetMinutes}
							/>
						</div>
					)}
				</section>
			)}
		</div>
	);
}

function TimeField({
	name,
	label,
	defaultValue,
}: {
	name: string;
	label: string;
	defaultValue: string;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<input
				type="time"
				name={name}
				defaultValue={defaultValue}
				required
				className="h-11 rounded-xl border px-3 font-normal"
			/>
		</label>
	);
}
function NumberField({
	name,
	label,
	defaultValue,
	step,
}: {
	name: string;
	label: string;
	defaultValue?: number;
	step?: string;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<input
				type="number"
				name={name}
				defaultValue={defaultValue}
				step={step}
				className="h-11 rounded-xl border px-3 font-normal"
			/>
		</label>
	);
}
function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-xl bg-muted p-4">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-2 text-2xl font-black">{value}</p>
		</div>
	);
}
function formatTime(value: string | Date, locale: string) {
	return new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: "Asia/Bangkok" }).format(
		new Date(value),
	);
}
function toMinutes(value: string) {
	const [hours, minutes] = value.split(":").map(Number);
	return hours * 60 + minutes;
}
