import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
	BriefcaseBusiness,
	Building2,
	CalendarClock,
	Check,
	ChevronRight,
	CircleDot,
	ClipboardCheck,
	FileCheck2,
	FileText,
	GraduationCap,
	HelpCircle,
	Languages,
	LayoutDashboard,
	LogOut,
	Settings,
	TicketCheck,
	UsersRound,
	UserRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { authClient, signInWithLine } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import {
	getNavigationForRole,
	getPrimaryNavigationForRole,
	type NavigationKey,
	type OrganizationRole,
} from "@/features/organizations/role-navigation";
import { resolveWorkspaceId } from "@/features/organizations/workspace-selection";
import { OnboardingPage } from "@/features/onboarding/onboarding-page";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import {
	dashboardFromReport,
	dashboardFromWorkflow,
	dashboardProgressIndex,
	liveDashboardQueryOptions,
	type DashboardSnapshot,
} from "./dashboard-data";
import { dashboardNavigationLinks } from "./dashboard-navigation";

const WORKSPACE_KEY = "trainy-workspace-id";
const adminRoles: OrganizationRole[] = ["university_admin", "company_admin"];
const navigationDetails: Record<
	NavigationKey,
	{ label: MessageKey; icon: typeof LayoutDashboard }
> = {
	overview: { label: "nav.overview", icon: LayoutDashboard },
	requests: { label: "nav.requests", icon: ClipboardCheck },
	internship: { label: "nav.internship", icon: BriefcaseBusiness },
	history: { label: "nav.history", icon: FileText },
	approvals: { label: "nav.approvals", icon: ClipboardCheck },
	students: { label: "nav.students", icon: UsersRound },
	profile: { label: "nav.profile", icon: UserRound },
	internships: { label: "nav.internships", icon: BriefcaseBusiness },
	applications: { label: "nav.applications", icon: ClipboardCheck },
	placements: { label: "nav.placements", icon: Building2 },
	attendance: { label: "nav.attendance", icon: CalendarClock },
	academic: { label: "nav.academic", icon: GraduationCap },
	progress: { label: "nav.progress", icon: FileText },
	documents: { label: "nav.documents", icon: FileCheck2 },
	evaluations: { label: "nav.evaluations", icon: ClipboardCheck },
	invites: { label: "nav.invites", icon: TicketCheck },
	members: { label: "nav.members", icon: UsersRound },
	reports: { label: "nav.reports", icon: FileText },
};
const roleLabels: Record<OrganizationRole, MessageKey> = {
	university_admin: "role.university_admin",
	coordinator: "role.coordinator",
	advisor: "role.advisor",
	student: "role.student",
	company_admin: "role.company_admin",
	supervisor: "role.supervisor",
};

async function loadOrganizations() {
	const response = await apiClient.api.v1.organizations.$get();
	if (!response.ok)
		throw new Error(response.status === 401 ? "UNAUTHORIZED" : "ORGANIZATIONS_FAILED");
	return response.json();
}

export function AppDashboard() {
	const { locale, setLocale, t } = useLanguage();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const session = authClient.useSession();
	const [storedWorkspaceId, setStoredWorkspaceId] = useState(() =>
		localStorage.getItem(WORKSPACE_KEY),
	);
	const organizations = useQuery({
		queryKey: ["organizations"],
		queryFn: loadOrganizations,
		enabled: Boolean(session.data?.user),
	});
	const workspaceId = resolveWorkspaceId(organizations.data?.data ?? [], storedWorkspaceId);
	const activeContext = organizations.data?.data.find(
		(item) => item.organization.id === workspaceId,
	);
	const role = activeContext?.membership.role as OrganizationRole | undefined;
	const isAdmin = role ? adminRoles.includes(role) : false;
	const report = useQuery({
		queryKey: ["reports", workspaceId, "dashboard"],
		queryFn: async () => {
			const response = await apiClient.api.v1.reports.organizations[":organizationId"].$get({
				param: { organizationId: workspaceId! },
			});
			if (!response.ok) throw new Error("REPORT_FAILED");
			return response.json();
		},
		enabled: Boolean(workspaceId && isAdmin && pathname === "/app"),
		...liveDashboardQueryOptions,
	});
	const placements = useQuery({
		queryKey: ["placements", role === "student" ? "me" : workspaceId, "dashboard"],
		queryFn: async () => {
			const response =
				role === "student"
					? await apiClient.api.v1.placements.me.$get()
					: await apiClient.api.v1.placements.organizations[":organizationId"].$get({
							param: { organizationId: workspaceId! },
						});
			if (!response.ok) throw new Error("PLACEMENTS_FAILED");
			return response.json();
		},
		enabled: Boolean(workspaceId && role && !isAdmin && pathname === "/app"),
		...liveDashboardQueryOptions,
	});
	const applications = useQuery({
		queryKey: ["applications", "me", "dashboard"],
		queryFn: async () => {
			const response = await apiClient.api.v1.internships.applications.me.$get();
			if (!response.ok) throw new Error("APPLICATIONS_FAILED");
			return response.json();
		},
		enabled: role === "student" && pathname === "/app",
		...liveDashboardQueryOptions,
	});
	const internshipRequests = useQuery({
		queryKey: ["internship-requests", "me", "dashboard"],
		queryFn: async () => {
			const response = await apiClient.api.v1["internship-requests"].me.$get();
			if (!response.ok) throw new Error("INTERNSHIP_REQUESTS_FAILED");
			return response.json();
		},
		enabled: role === "student" && pathname === "/app",
		...liveDashboardQueryOptions,
	});

	if (session.isPending) return <FullPageMessage title={t("dashboard.loadingSession")} />;
	if (!session.data?.user) return <SignedOut />;
	const navigation = role ? getNavigationForRole(role) : (["overview"] as const);
	const primaryNavigation = role ? getPrimaryNavigationForRole(role) : (["overview"] as const);
	const desktopNavigation = [
		...primaryNavigation,
		...navigation.filter((key) => {
			const destination = dashboardNavigationLinks[key as keyof typeof dashboardNavigationLinks];
			return !primaryNavigation.some(
				(primaryKey) =>
					dashboardNavigationLinks[primaryKey as keyof typeof dashboardNavigationLinks] ===
					destination,
			);
		}),
	];
	const snapshot = report.data?.data
		? dashboardFromReport(report.data.data)
		: role
			? dashboardFromWorkflow({
					role,
					placements: placements.data?.data ?? [],
					applications: applications.data?.data,
					requests: internshipRequests.data?.data,
					organizationCount: organizations.data?.data.length ?? 0,
				})
			: undefined;
	const dashboardLoading = isAdmin
		? report.isLoading
		: placements.isLoading ||
			(role === "student" && (applications.isLoading || internshipRequests.isLoading));
	const dashboardError = isAdmin
		? report.isError
		: placements.isError || applications.isError || internshipRequests.isError;
	const renderNavItems = (items: readonly NavigationKey[], mobile = false) =>
		items.map((key) => {
			const { label, icon: Icon } = navigationDetails[key];
			const destination = dashboardNavigationLinks[key as keyof typeof dashboardNavigationLinks];
			const active = destination === "/app" ? pathname === "/app" : destination === pathname;
			const className = mobile
				? `flex min-h-14 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`
				: `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`;
			return destination ? (
				<Link
					key={key}
					to={destination}
					className={className}
					aria-current={active ? "page" : undefined}
				>
					<Icon className={mobile ? "size-5" : "size-5"} />
					<span className={mobile ? "max-w-full truncate" : undefined}>{t(label)}</span>
				</Link>
			) : (
				<span
					key={key}
					className={`${className} cursor-not-allowed opacity-50`}
					aria-disabled="true"
					title={`${t(label)} · ${t("dashboard.comingSoon")}`}
				>
					<Icon className="size-5" />
					<span className={mobile ? "max-w-full truncate" : undefined}>{t(label)}</span>
				</span>
			);
		});

	return (
		<div className="min-h-screen bg-background lg:grid lg:grid-cols-[276px_1fr]">
			<aside className="sticky top-0 hidden h-screen p-4 pr-0 lg:block">
				<div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_18px_48px_rgb(16_17_15_/_0.14)]">
					<div className="flex h-20 items-center border-b border-sidebar-border px-6">
						<BrandMark />
					</div>
					<nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Application navigation">
						{renderNavItems(desktopNavigation)}
					</nav>
					{activeContext && (
						<div className="border-t border-sidebar-border p-4">
							<p className="truncate text-sm font-semibold">{activeContext.organization.name}</p>
							<p className="mt-1 text-xs text-sidebar-foreground/50">
								{role ? t(roleLabels[role]) : t("dashboard.workspace")}
							</p>
						</div>
					)}
				</div>
			</aside>
			<div className="min-w-0">
				<header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/88 px-5 backdrop-blur-xl sm:px-8">
					<div className="lg:hidden">
						<BrandMark />
					</div>
					<div className="hidden min-w-0 flex-1 sm:block">
						<p className="truncate text-sm font-semibold">
							{activeContext?.organization.name ?? t("dashboard.workspace")}
						</p>
						<p className="mt-0.5 text-xs text-muted-foreground">
							{pathname === "/app" ? t("nav.overview") : t("dashboard.workspace")}
						</p>
					</div>
					<div className="ml-auto flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setLocale(locale === "th" ? "en" : "th")}
						>
							<Languages />
							<span className="hidden sm:inline">{locale === "th" ? "EN" : t("common.thai")}</span>
						</Button>
						<Button variant="ghost" size="sm" asChild>
							<Link to="/app/reviews">
								<ClipboardCheck />
								<span className="hidden sm:inline">{t("dashboard.reviews")}</span>
							</Link>
						</Button>
						<NotificationBell />
						<AccountMenu
							name={session.data.user.name}
							email={session.data.user.email}
							profileAvailable={role === "student"}
						/>
					</div>
				</header>
				<main className="mx-auto max-w-[1280px] px-5 pb-24 pt-7 sm:px-8 sm:py-9 lg:pb-12">
					{pathname !== "/app" ? (
						<Outlet />
					) : !organizations.isLoading && !activeContext ? (
						<OnboardingPage />
					) : (
						<DashboardOverview
							userName={session.data.user.name}
							activeContext={activeContext}
							role={role}
							snapshot={snapshot}
							loading={dashboardLoading}
							error={dashboardError}
							organizations={organizations.data?.data ?? []}
							workspaceId={workspaceId}
							onWorkspaceChange={(id) => {
								localStorage.setItem(WORKSPACE_KEY, id);
								setStoredWorkspaceId(id);
							}}
						/>
					)}
				</main>
				<nav
					className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
					aria-label="Application navigation"
				>
					{renderNavItems(primaryNavigation, true)}
				</nav>
			</div>
		</div>
	);
}

function DashboardOverview({
	userName,
	activeContext,
	role,
	snapshot,
	loading,
	error,
	organizations,
	workspaceId,
	onWorkspaceChange,
}: {
	userName: string;
	activeContext:
		{ organization: { id: string; name: string }; membership: { role: string } } | undefined;
	role: OrganizationRole | undefined;
	snapshot: DashboardSnapshot | undefined;
	loading: boolean;
	error: boolean;
	organizations: Array<{
		organization: { id: string; name: string };
		membership: { role: string };
	}>;
	workspaceId: string | undefined;
	onWorkspaceChange: (id: string) => void;
}) {
	const { locale, t } = useLanguage();
	const label = (key: DashboardSnapshot["primaryLabel"] | DashboardSnapshot["secondaryLabel"]) =>
		`dashboard.stat.${key}` as MessageKey;
	const currentStage = dashboardProgressIndex(snapshot, role);
	const journeyLabels = [0, 1, 2, 3].map((index) =>
		t(`dashboard.journey.${role === "student" ? "student" : "staff"}.${index + 1}` as MessageKey),
	);
	const today = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(new Date());
	const nextActionTitle =
		role === "student"
			? snapshot?.nextAction === "editRequest"
				? t("dashboard.editInternshipRequest")
				: snapshot?.nextAction === "awaitRequestReview"
					? t("dashboard.awaitInternshipRequestReview")
					: t("dashboard.pendingApplications")
			: t("dashboard.pendingPlacements");
	const nextActionDestination =
		role === "student" && ["editRequest", "awaitRequestReview"].includes(snapshot?.nextAction ?? "")
			? "/app/internship-request"
			: role === "student"
				? "/app/applications"
				: "/app/placements";
	return (
		<div className="space-y-6">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
				<div>
					<p className="text-sm text-muted-foreground">{today}</p>
					<h1 className="mt-1.5 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
						{t("dashboard.greeting")}, {userName}
					</h1>
					<p className="mt-2 text-sm text-muted-foreground sm:text-base">
						{activeContext
							? `${activeContext.organization.name} · ${role ? t(roleLabels[role]) : ""}`
							: t("dashboard.subtitle")}
					</p>
				</div>
				<span className="w-fit rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
					{loading ? t("dashboard.organizationsLoading") : t("dashboard.liveStatus")}
				</span>
			</div>
			{error && (
				<p
					role="alert"
					className="rounded-xl border border-destructive/20 bg-destructive-muted p-4 text-sm text-destructive"
				>
					{t("dashboard.loadError")}
				</p>
			)}
			<section className="rounded-[24px] border bg-card p-5 shadow-[0_8px_30px_rgb(16_17_15_/_0.045)] sm:p-7">
				<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
							{t("dashboard.currentStatus")}
						</p>
						<h2 className="mt-2 text-xl font-bold sm:text-2xl">
							{loading ? t("dashboard.organizationsLoading") : journeyLabels[currentStage]}
						</h2>
					</div>
					<span className="w-fit rounded-full bg-warning-muted px-3 py-1.5 text-xs font-bold text-warning-foreground">
						{(snapshot?.actionItems ?? 0) > 0
							? `${snapshot?.actionItems ?? 0} ${t("dashboard.actionCount")}`
							: t("dashboard.onTrack")}
					</span>
				</div>
				<DashboardJourney labels={journeyLabels} currentStage={currentStage} loading={loading} />
				<div className="mt-6 flex flex-col gap-4 rounded-2xl bg-muted/70 p-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="font-semibold">
							{(snapshot?.actionItems ?? 0) > 0 ? nextActionTitle : t("dashboard.noActions")}
						</p>
						<p className="mt-1 text-sm text-muted-foreground">{t("dashboard.nextDetail")}</p>
					</div>
					{(snapshot?.actionItems ?? 0) > 0 && (
						<Button asChild className="shrink-0">
							<Link to={nextActionDestination}>
								{t("dashboard.openTask")}
								<ChevronRight />
							</Link>
						</Button>
					)}
				</div>
			</section>

			<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label={snapshot ? t(label(snapshot.primaryLabel)) : "—"}
					value={loading ? "—" : (snapshot?.primaryValue ?? 0)}
					icon={Building2}
				/>
				<StatCard
					label={t("dashboard.stat.actions")}
					value={loading ? "—" : (snapshot?.actionItems ?? 0)}
					icon={ClipboardCheck}
					accent
				/>
				<StatCard
					label={t("dashboard.stat.completed")}
					value={loading ? "—" : (snapshot?.completedItems ?? 0)}
					icon={FileText}
				/>
				<StatCard
					label={snapshot ? t(label(snapshot.secondaryLabel)) : "—"}
					value={loading ? "—" : (snapshot?.secondaryValue ?? 0)}
					icon={UsersRound}
				/>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
				<div className="rounded-[22px] border bg-card p-6">
					<div className="flex items-center justify-between gap-4">
						<div>
							<h2 className="text-lg font-bold">{t("dashboard.next")}</h2>
							<p className="mt-1 text-sm text-muted-foreground">{t("dashboard.nextDetail")}</p>
						</div>
						<span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
							{snapshot?.actionItems ?? 0}
						</span>
					</div>
					<div className="mt-4 divide-y">
						{(snapshot?.actionItems ?? 0) > 0 ? (
							<Task title={nextActionTitle} to={nextActionDestination} urgent />
						) : (
							<p className="py-5 text-sm text-muted-foreground">{t("dashboard.noActions")}</p>
						)}
						{(snapshot?.primaryValue ?? 0) > 0 && (
							<Task title={t("dashboard.activePlacement")} to="/app/placements" />
						)}
					</div>
				</div>
				<div className="rounded-[22px] border bg-card p-6">
					<h2 className="text-lg font-bold">{t("dashboard.myOrganizations")}</h2>
					{organizations.map((item) => (
						<button
							type="button"
							onClick={() => onWorkspaceChange(item.organization.id)}
							key={item.organization.id}
							className={`mt-4 flex w-full items-center gap-3 rounded-xl p-4 text-left transition ${item.organization.id === workspaceId ? "bg-accent ring-1 ring-primary/20" : "bg-muted hover:bg-muted/70"}`}
						>
							<span className="grid size-10 place-items-center rounded-lg bg-card text-primary">
								<Building2 className="size-5" />
							</span>
							<span className="min-w-0">
								<span className="block truncate font-semibold">{item.organization.name}</span>
								<span className="text-xs text-muted-foreground">
									{t(roleLabels[item.membership.role as OrganizationRole])}
								</span>
							</span>
						</button>
					))}
				</div>
			</section>
		</div>
	);
}

function DashboardJourney({
	labels,
	currentStage,
	loading,
}: {
	labels: string[];
	currentStage: number;
	loading: boolean;
}) {
	return (
		<ol className="mt-7 grid gap-3 sm:grid-cols-4 sm:gap-0" aria-label="Workflow progress">
			{labels.map((label, index) => {
				const complete = !loading && index < currentStage;
				const current = !loading && index === currentStage;
				return (
					<li key={label} className="relative flex items-center gap-3 sm:block sm:pt-8">
						<div
							className={`hidden sm:absolute sm:left-0 sm:right-0 sm:top-[9px] sm:block sm:h-0.5 ${index <= currentStage && !loading ? "bg-accent" : "bg-border"}`}
						/>
						<span
							className={`relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2 sm:absolute sm:left-0 sm:top-0 ${complete ? "border-success bg-success text-white" : current ? "border-primary bg-card ring-4 ring-accent/40" : "border-border bg-card"}`}
						>
							{complete ? (
								<Check className="size-3.5" />
							) : current ? (
								<CircleDot className="size-3" />
							) : null}
						</span>
						<span
							className={`text-xs sm:pr-4 ${current ? "font-bold text-foreground" : "text-muted-foreground"}`}
						>
							{label}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

function AccountMenu({
	name,
	email,
	profileAvailable,
}: {
	name: string;
	email: string;
	profileAvailable: boolean;
}) {
	const { t } = useLanguage();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (!open) return;
		function onPointerDown(event: PointerEvent) {
			if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
		}
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			setOpen(false);
			triggerRef.current?.focus();
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);
	return (
		<div className="relative" ref={containerRef}>
			<Button
				ref={triggerRef}
				variant="ghost"
				size="icon"
				className="size-11 rounded-full bg-accent font-bold text-primary"
				aria-label={t("dashboard.accountMenu")}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((value) => !value)}
			>
				{name.slice(0, 1).toUpperCase()}
			</Button>
			{open && (
				<div
					role="menu"
					aria-label={t("dashboard.account")}
					className="absolute right-0 top-13 z-50 w-64 overflow-hidden rounded-2xl border bg-card p-2 shadow-xl"
				>
					<div className="border-b px-3 py-2">
						<p className="truncate text-sm font-semibold">{name}</p>
						<p className="truncate text-xs text-muted-foreground">{email}</p>
					</div>
					{profileAvailable ? (
						<Button variant="ghost" className="mt-1 w-full justify-start" asChild>
							<Link role="menuitem" to="/app/profile" onClick={() => setOpen(false)}>
								<UserRound />
								{t("nav.profile")}
							</Link>
						</Button>
					) : (
						<MenuUnavailable icon={UserRound} label={t("nav.profile")} />
					)}
					<MenuUnavailable icon={Settings} label={t("dashboard.settings")} />
					<MenuUnavailable icon={HelpCircle} label={t("dashboard.help")} />
					<Button
						role="menuitem"
						variant="ghost"
						className="w-full justify-start text-destructive hover:text-destructive"
						onClick={() => authClient.signOut()}
					>
						<LogOut />
						{t("dashboard.signOut")}
					</Button>
				</div>
			)}
		</div>
	);
}

function MenuUnavailable({ icon: Icon, label }: { icon: typeof Settings; label: string }) {
	const { t } = useLanguage();
	return (
		<span
			role="menuitem"
			aria-disabled="true"
			className="flex h-9 cursor-not-allowed items-center gap-2 rounded-md px-4 text-sm font-medium opacity-50"
			title={t("dashboard.comingSoon")}
		>
			<Icon className="size-4" />
			{label}
		</span>
	);
}

function SignedOut() {
	const { t } = useLanguage();
	return (
		<div className="grid min-h-screen place-items-center bg-background p-5">
			<div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl shadow-foreground/5">
				<BrandMark className="justify-center" />
				<div className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
					<BriefcaseBusiness />
				</div>
				<h1 className="mt-5 text-2xl font-black">{t("dashboard.signedOutTitle")}</h1>
				<p className="mt-3 leading-7 text-muted-foreground">{t("dashboard.signedOutDetail")}</p>
				<Button className="mt-7 w-full" size="lg" onClick={() => signInWithLine()}>
					{t("auth.signIn")}
				</Button>
				<a
					href="/"
					className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
				>
					{t("dashboard.backHome")}
				</a>
			</div>
		</div>
	);
}
function FullPageMessage({ title }: { title: string }) {
	return (
		<div className="grid min-h-screen place-items-center">
			<p className="font-semibold text-muted-foreground">{title}</p>
		</div>
	);
}
function StatCard({
	label,
	value,
	icon: Icon,
	accent = false,
}: {
	label: string;
	value: string | number;
	icon: typeof Building2;
	accent?: boolean;
}) {
	return (
		<div className="rounded-2xl border bg-card p-5">
			<div
				className={`grid size-10 place-items-center rounded-xl ${accent ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
			>
				<Icon className="size-5" />
			</div>
			<p className="mt-5 text-3xl font-black">{value}</p>
			<p className="mt-1 text-sm text-muted-foreground">{label}</p>
		</div>
	);
}
function Task({
	title,
	to,
	urgent = false,
}: {
	title: string;
	to: "/app/applications" | "/app/internship-request" | "/app/placements";
	urgent?: boolean;
}) {
	return (
		<Link to={to} className="flex items-center gap-4 py-4">
			<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
				<ClipboardCheck className="size-5" />
			</span>
			<p className={`min-w-0 flex-1 truncate font-semibold ${urgent ? "text-destructive" : ""}`}>
				{title}
			</p>
			<ChevronRight className="size-4 text-muted-foreground" />
		</Link>
	);
}
