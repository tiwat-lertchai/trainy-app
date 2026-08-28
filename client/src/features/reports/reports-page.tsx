import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ClipboardCheck, UsersRound } from "lucide-react";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import { apiClient } from "@/lib/api-client";

const WORKSPACE_KEY = "trainy-workspace-id";
const statusLabels: Record<string, MessageKey> = {
	pending: "status.pending",
	active: "status.active",
	completed: "status.completed",
	cancelled: "status.cancelled",
	submitted: "status.submitted",
	under_review: "status.underReview",
	accepted: "status.accepted",
	rejected: "status.rejected",
	withdrawn: "status.withdrawn",
};

export function ReportsPage() {
	const { t } = useLanguage();
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
	const isAdmin =
		context?.membership.role === "university_admin" || context?.membership.role === "company_admin";

	const report = useQuery({
		queryKey: ["reports", organizationId],
		queryFn: async () => {
			const r = await apiClient.api.v1.reports.organizations[":organizationId"].$get({
				param: { organizationId: organizationId! },
			});
			if (!r.ok) throw new Error();
			return r.json();
		},
		enabled: Boolean(organizationId) && isAdmin,
	});

	if (organizations.isLoading)
		return (
			<div className="grid min-h-80 place-items-center text-muted-foreground">
				{t("reports.loading")}
			</div>
		);
	if (!isAdmin)
		return (
			<div className="mx-auto max-w-xl rounded-3xl border bg-white p-8 text-center text-muted-foreground">
				{t("reports.forbidden")}
			</div>
		);

	const data = report.data?.data;
	return (
		<div>
			<p className="text-sm font-semibold text-primary">{t("reports.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("reports.title")}</h1>
			<p className="mt-2 text-muted-foreground">
				{t("reports.description", { organization: context?.organization.name ?? "" })}
			</p>

			{report.isLoading && <div className="mt-8 h-32 animate-pulse rounded-2xl bg-muted" />}
			{report.isError && (
				<div
					role="alert"
					className="mt-8 rounded-2xl border border-destructive/20 bg-white p-6 text-destructive"
				>
					{t("reports.loadError")}
				</div>
			)}

			{data && (
				<>
					<section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						<Stat icon={UsersRound} label={t("reports.activeMembers")} value={data.activeMembers} />
						{data.internships !== undefined && (
							<Stat
								icon={BriefcaseBusiness}
								label={t("reports.internships")}
								value={data.internships}
							/>
						)}
						<Stat
							icon={ClipboardCheck}
							label={t("reports.applications")}
							value={data.applications.reduce((sum, item) => sum + item.count, 0)}
						/>
					</section>
					<section className="mt-6 grid gap-6 sm:grid-cols-2">
						<StatusBreakdown title={t("reports.applicationsByStatus")} counts={data.applications} />
						<StatusBreakdown title={t("reports.placementsByStatus")} counts={data.placements} />
					</section>
				</>
			)}
		</div>
	);
}

function Stat({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof UsersRound;
	label: string;
	value: number;
}) {
	return (
		<div className="rounded-2xl border bg-white p-6">
			<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
				<Icon />
			</span>
			<p className="mt-4 text-sm text-muted-foreground">{label}</p>
			<p className="mt-1 text-3xl font-black">{value}</p>
		</div>
	);
}

function StatusBreakdown({
	title,
	counts,
}: {
	title: string;
	counts: Array<{ status: string; count: number }>;
}) {
	const { t } = useLanguage();
	return (
		<div className="rounded-2xl border bg-white p-6">
			<h2 className="font-bold">{title}</h2>
			{counts.length === 0 && (
				<p className="mt-4 text-sm text-muted-foreground">{t("reports.noData")}</p>
			)}
			<div className="mt-4 grid gap-2">
				{counts.map((item) => (
					<div
						key={item.status}
						className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm"
					>
						<span>{statusLabels[item.status] ? t(statusLabels[item.status]) : item.status}</span>
						<span className="font-bold">{item.count}</span>
					</div>
				))}
			</div>
		</div>
	);
}
