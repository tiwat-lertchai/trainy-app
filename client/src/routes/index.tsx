/* eslint-disable react-refresh/only-export-components -- TanStack Router requires the route export beside its page component. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	BellRing,
	BriefcaseBusiness,
	Building2,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock3,
	FileCheck2,
	GraduationCap,
	Languages,
	LineChart,
	Menu,
	ShieldCheck,
	Sparkles,
	UsersRound,
	X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import { signInWithLine } from "@/lib/auth-client";

export const Route = createFileRoute("/")({ component: LandingPage });
export const landingSections = ["features", "workflow", "roles", "security"] as const;

function LandingPage() {
	const { locale, setLocale, t } = useLanguage();
	const [menuOpen, setMenuOpen] = useState(false);
	const [signingIn, setSigningIn] = useState(false);

	useEffect(() => {
		if (!menuOpen) return;
		const close = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, [menuOpen]);

	async function handleSignIn() {
		setSigningIn(true);
		try {
			await signInWithLine();
		} finally {
			setSigningIn(false);
		}
	}

	return (
		<div className="min-h-screen overflow-hidden bg-[#f8fafc]">
			<header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
				<div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
					<a href="#top" aria-label="Trainy home">
						<BrandMark />
					</a>
					<nav
						className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex"
						aria-label="Primary navigation"
					>
						{landingSections.map((section) => (
							<a
								key={section}
								className="transition-colors hover:text-primary"
								href={`#${section}`}
							>
								{t(`nav.${section}` as MessageKey)}
							</a>
						))}
					</nav>
					<div className="hidden items-center gap-3 md:flex">
						<LanguageToggle locale={locale} onChange={setLocale} />
						<Button
							className="h-11 rounded-xl px-5 shadow-lg shadow-primary/15"
							onClick={handleSignIn}
							disabled={signingIn}
						>
							{signingIn ? t("auth.signingIn") : t("auth.signIn")}
						</Button>
					</div>
					<Button
						className="size-11 md:hidden"
						variant="ghost"
						size="icon"
						aria-expanded={menuOpen}
						aria-controls="mobile-menu"
						aria-label={t("nav.toggle")}
						onClick={() => setMenuOpen((open) => !open)}
					>
						{menuOpen ? <X /> : <Menu />}
					</Button>
				</div>
				{menuOpen && (
					<div id="mobile-menu" className="border-t border-slate-200 bg-white px-5 py-5 md:hidden">
						<nav className="grid gap-1" aria-label="Mobile navigation">
							{landingSections.map((section) => (
								<a
									key={section}
									className="rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"
									href={`#${section}`}
									onClick={() => setMenuOpen(false)}
								>
									{t(`nav.${section}` as MessageKey)}
								</a>
							))}
						</nav>
						<div className="mt-4 grid grid-cols-[auto_1fr] gap-3 border-t pt-4">
							<LanguageToggle locale={locale} onChange={setLocale} />
							<Button className="h-11 rounded-xl" onClick={handleSignIn} disabled={signingIn}>
								{signingIn ? t("auth.signingIn") : t("auth.signIn")}
							</Button>
						</div>
					</div>
				)}
			</header>

			<main id="top" className="pt-18">
				<section className="relative isolate overflow-hidden">
					<div className="hero-grid absolute inset-0 opacity-70" />
					<div className="pointer-events-none absolute left-1/2 top-[-24rem] h-[54rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(52,103,227,0.2),transparent_64%)]" />
					<div className="relative mx-auto grid min-h-[calc(100svh-4.5rem)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:py-28">
						<div className="max-w-2xl">
							<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3.5 py-2 text-sm font-bold text-primary shadow-sm backdrop-blur">
								<Sparkles className="size-4" />
								{t("hero.eyebrow")}
							</div>
							<h1 className="text-balance text-[2.75rem] font-black leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.25rem]">
								{t("hero.title")}
							</h1>
							<p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
								{t("hero.description")}
							</p>
							<div className="mt-9 flex flex-col gap-3 sm:flex-row">
								<Button
									size="lg"
									className="h-13 rounded-xl px-7 text-base shadow-xl shadow-primary/20"
									onClick={handleSignIn}
									disabled={signingIn}
								>
									{t("hero.primary")}
									<ArrowRight />
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="h-13 rounded-xl border-slate-300 bg-white/70 px-7 text-base"
									asChild
								>
									<a href="#workflow">{t("hero.secondary")}</a>
								</Button>
							</div>
							<div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-600">
								<MiniCheck text={t("hero.note")} />
								<MiniCheck text={t("hero.responsive")} />
							</div>
						</div>
						<DashboardPreview />
					</div>
					<div className="relative mx-auto grid max-w-7xl grid-cols-2 border-x border-t border-slate-200/80 bg-white/65 backdrop-blur sm:grid-cols-4">
						<Proof value="5" label={t("proof.roles")} />
						<Proof value="1" label={t("proof.workflow")} />
						<Proof value="24/7" label={t("proof.visibility")} />
						<Proof value="TH · EN" label={t("proof.language")} />
					</div>
				</section>

				<section id="features" className="scroll-mt-18 bg-white py-22 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<SectionHeading
							eyebrow={t("features.eyebrow")}
							title={t("features.title")}
							description={t("features.description")}
						/>
						<div className="mt-12 grid gap-5 lg:grid-cols-2">
							<FeatureCard
								icon={BellRing}
								tone="blue"
								title={t("features.actionTitle")}
								detail={t("features.actionDetail")}
							/>
							<FeatureCard
								icon={LineChart}
								tone="green"
								title={t("features.progressTitle")}
								detail={t("features.progressDetail")}
							/>
							<FeatureCard
								icon={FileCheck2}
								tone="violet"
								title={t("features.documentsTitle")}
								detail={t("features.documentsDetail")}
							/>
							<FeatureCard
								icon={UsersRound}
								tone="amber"
								title={t("features.rolesTitle")}
								detail={t("features.rolesDetail")}
							/>
						</div>
					</div>
				</section>

				<section
					id="workflow"
					className="scroll-mt-18 border-y border-slate-200 bg-slate-950 py-22 text-white sm:py-28"
				>
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<SectionHeading
							dark
							eyebrow={t("workflow.eyebrow")}
							title={t("workflow.title")}
							description={t("workflow.description")}
						/>
						<div className="mt-14 grid gap-8 md:grid-cols-4">
							<WorkflowStep
								number="01"
								title={t("workflow.step1")}
								detail={t("workflow.step1Detail")}
							/>
							<WorkflowStep
								number="02"
								title={t("workflow.step2")}
								detail={t("workflow.step2Detail")}
							/>
							<WorkflowStep
								number="03"
								title={t("workflow.step3")}
								detail={t("workflow.step3Detail")}
							/>
							<WorkflowStep
								number="04"
								title={t("workflow.step4")}
								detail={t("workflow.step4Detail")}
							/>
						</div>
					</div>
				</section>

				<section id="roles" className="scroll-mt-18 bg-[#f8fafc] py-22 sm:py-28">
					<div className="mx-auto max-w-7xl px-5 sm:px-8">
						<SectionHeading
							eyebrow={t("roles.eyebrow")}
							title={t("roles.title")}
							description={t("roles.description")}
						/>
						<div className="mt-12 grid gap-5 md:grid-cols-3">
							<RoleCard
								icon={GraduationCap}
								title={t("roles.student")}
								detail={t("roles.studentDetail")}
								points={[
									t("roles.studentPoint1"),
									t("roles.studentPoint2"),
									t("roles.studentPoint3"),
								]}
							/>
							<RoleCard
								icon={UsersRound}
								title={t("roles.advisor")}
								detail={t("roles.advisorDetail")}
								points={[
									t("roles.advisorPoint1"),
									t("roles.advisorPoint2"),
									t("roles.advisorPoint3"),
								]}
								featured
							/>
							<RoleCard
								icon={Building2}
								title={t("roles.organization")}
								detail={t("roles.organizationDetail")}
								points={[
									t("roles.organizationPoint1"),
									t("roles.organizationPoint2"),
									t("roles.organizationPoint3"),
								]}
							/>
						</div>
					</div>
				</section>

				<section id="security" className="scroll-mt-18 bg-white py-22 sm:py-28">
					<div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
						<div>
							<SectionHeading
								eyebrow={t("security.eyebrow")}
								title={t("security.title")}
								description={t("security.description")}
							/>
							<div className="mt-8 grid gap-4 sm:grid-cols-2">
								<SecurityPoint
									title={t("security.identity")}
									detail={t("security.identityDetail")}
								/>
								<SecurityPoint title={t("security.access")} detail={t("security.accessDetail")} />
								<SecurityPoint title={t("security.audit")} detail={t("security.auditDetail")} />
								<SecurityPoint title={t("security.privacy")} detail={t("security.privacyDetail")} />
							</div>
						</div>
						<div className="relative overflow-hidden rounded-[2rem] bg-primary p-8 text-white shadow-2xl shadow-primary/25 sm:p-11">
							<div className="absolute -right-20 -top-20 size-64 rounded-full border-[44px] border-white/10" />
							<ShieldCheck className="relative size-12" />
							<p className="relative mt-10 text-sm font-bold uppercase tracking-[0.18em] text-blue-100">
								{t("security.cardEyebrow")}
							</p>
							<p className="relative mt-3 text-3xl font-black leading-tight sm:text-4xl">
								{t("security.cardTitle")}
							</p>
							<p className="relative mt-5 leading-7 text-blue-100">{t("security.cardDetail")}</p>
						</div>
					</div>
				</section>

				<section className="px-5 pb-8 sm:px-8 sm:pb-12">
					<div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-center text-white sm:px-12 sm:py-16">
						<p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-300">
							{t("cta.eyebrow")}
						</p>
						<h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-black tracking-tight sm:text-5xl">
							{t("cta.title")}
						</h2>
						<p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
							{t("cta.description")}
						</p>
						<Button
							size="lg"
							className="mt-8 h-13 rounded-xl px-8 text-base"
							onClick={handleSignIn}
							disabled={signingIn}
						>
							{t("hero.primary")}
							<ArrowRight />
						</Button>
					</div>
				</section>
			</main>
			<footer className="border-t border-slate-200 bg-white">
				<div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
					<BrandMark />
					<p className="text-sm text-slate-500">{t("footer.description")}</p>
					<LanguageToggle locale={locale} onChange={setLocale} />
				</div>
			</footer>
		</div>
	);
}

function LanguageToggle({
	locale,
	onChange,
}: {
	locale: "th" | "en";
	onChange: (locale: "th" | "en") => void;
}) {
	return (
		<button
			type="button"
			className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-primary/30 hover:bg-blue-50"
			onClick={() => onChange(locale === "th" ? "en" : "th")}
			aria-label="Change language"
		>
			<Languages className="size-4 text-primary" />
			{locale.toUpperCase()}
			<ChevronDown className="size-3.5 text-slate-400" />
		</button>
	);
}
function MiniCheck({ text }: { text: string }) {
	return (
		<span className="flex items-center gap-2">
			<span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
				<Check className="size-3" />
			</span>
			{text}
		</span>
	);
}
function DashboardPreview() {
	const { t } = useLanguage();
	return (
		<div className="relative mx-auto w-full max-w-2xl lg:translate-x-4">
			<div className="absolute -inset-5 rounded-[2.4rem] bg-gradient-to-br from-primary/15 via-transparent to-emerald-300/20 blur-2xl" />
			<div className="relative rounded-[1.8rem] border border-white bg-white/80 p-2.5 shadow-[0_35px_90px_-28px_rgba(15,23,42,0.38)] backdrop-blur-xl">
				<div className="overflow-hidden rounded-[1.3rem] border border-slate-200 bg-slate-50">
					<div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
						<BrandMark className="origin-left scale-90" />
						<div className="flex items-center gap-3">
							<BellRing className="size-4 text-slate-400" />
							<span className="size-9 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100" />
						</div>
					</div>
					<div className="p-5 sm:p-7">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
									{t("preview.workspace")}
								</p>
								<h2 className="mt-2 text-xl font-black sm:text-2xl">{t("preview.heading")}</h2>
								<p className="mt-1 text-sm text-slate-500">{t("preview.subheading")}</p>
							</div>
							<span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
								{t("preview.onTrack")}
							</span>
						</div>
						<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<p className="text-sm font-bold">{t("preview.journey")}</p>
								<p className="text-sm font-black text-primary">64%</p>
							</div>
							<div className="mt-4 h-2 rounded-full bg-slate-100">
								<div className="h-full w-[64%] rounded-full bg-gradient-to-r from-primary to-blue-400" />
							</div>
							<div className="mt-3 flex justify-between text-[10px] font-semibold text-slate-400 sm:text-xs">
								<span>{t("preview.approved")}</span>
								<span>{t("preview.active")}</span>
								<span>{t("preview.complete")}</span>
							</div>
						</div>
						<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
							<Metric icon={Clock3} label={t("preview.hours")} value="128" />
							<Metric icon={LineChart} label={t("preview.progress")} value="64%" />
							<div className="hidden sm:block">
								<Metric icon={BriefcaseBusiness} label={t("preview.active")} value="1" />
							</div>
						</div>
						<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
							<div className="flex items-center justify-between">
								<h3 className="font-black">{t("preview.next")}</h3>
								<span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
									2 {t("preview.items")}
								</span>
							</div>
							<div className="mt-3 space-y-2">
								<ActionItem title={t("preview.task1")} due={t("preview.today")} urgent />
								<ActionItem title={t("preview.task2")} due={t("preview.friday")} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
function Metric({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof BriefcaseBusiness;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4">
			<div className="flex items-center gap-2 text-slate-500">
				<Icon className="size-4 text-primary" />
				<span className="truncate text-xs font-semibold">{label}</span>
			</div>
			<p className="mt-3 text-2xl font-black">{value}</p>
		</div>
	);
}
function ActionItem({
	title,
	due,
	urgent = false,
}: {
	title: string;
	due: string;
	urgent?: boolean;
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
			<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-primary">
				<CheckCircle2 className="size-4" />
			</span>
			<span className="min-w-0 flex-1 truncate text-xs font-bold sm:text-sm">{title}</span>
			<span
				className={
					urgent ? "text-xs font-bold text-red-600" : "text-xs font-semibold text-slate-500"
				}
			>
				{due}
			</span>
		</div>
	);
}
function Proof({ value, label }: { value: string; label: string }) {
	return (
		<div className="border-b border-r border-slate-200/80 px-4 py-6 text-center sm:border-b-0">
			<p className="text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
			<p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">{label}</p>
		</div>
	);
}
function SectionHeading({
	eyebrow,
	title,
	description,
	dark = false,
}: {
	eyebrow: string;
	title: string;
	description: string;
	dark?: boolean;
}) {
	return (
		<div className="max-w-3xl">
			<p
				className={
					dark
						? "text-sm font-black uppercase tracking-[0.18em] text-blue-300"
						: "text-sm font-black uppercase tracking-[0.18em] text-primary"
				}
			>
				{eyebrow}
			</p>
			<h2
				className={
					dark
						? "mt-4 text-balance text-3xl font-black tracking-tight text-white sm:text-5xl"
						: "mt-4 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-5xl"
				}
			>
				{title}
			</h2>
			<p
				className={
					dark ? "mt-5 text-lg leading-8 text-slate-300" : "mt-5 text-lg leading-8 text-slate-600"
				}
			>
				{description}
			</p>
		</div>
	);
}
const featureTones = {
	blue: "bg-blue-100 text-blue-700",
	green: "bg-emerald-100 text-emerald-700",
	violet: "bg-violet-100 text-violet-700",
	amber: "bg-amber-100 text-amber-700",
};
function FeatureCard({
	icon: Icon,
	title,
	detail,
	tone,
}: {
	icon: typeof BellRing;
	title: string;
	detail: string;
	tone: keyof typeof featureTones;
}) {
	return (
		<article className="group relative min-h-60 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/50 sm:p-9">
			<span className={`grid size-12 place-items-center rounded-2xl ${featureTones[tone]}`}>
				<Icon className="size-6" />
			</span>
			<h3 className="mt-8 text-2xl font-black text-slate-950">{title}</h3>
			<p className="mt-3 max-w-xl leading-7 text-slate-600">{detail}</p>
			<div className="absolute -bottom-20 -right-20 size-52 rounded-full border-[38px] border-slate-200/50 transition-transform group-hover:scale-110" />
		</article>
	);
}
function WorkflowStep({
	number,
	title,
	detail,
}: {
	number: string;
	title: string;
	detail: string;
}) {
	return (
		<article className="relative border-l border-slate-700 pl-6 md:border-l-0 md:border-t md:pl-0 md:pt-8">
			<span className="absolute -left-3 top-0 grid size-6 place-items-center rounded-full bg-primary text-[9px] font-black md:-top-3 md:left-0">
				{number}
			</span>
			<h3 className="text-lg font-black">{title}</h3>
			<p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p>
		</article>
	);
}
function RoleCard({
	icon: Icon,
	title,
	detail,
	points,
	featured = false,
}: {
	icon: typeof GraduationCap;
	title: string;
	detail: string;
	points: string[];
	featured?: boolean;
}) {
	return (
		<article
			className={
				featured
					? "rounded-[1.75rem] border border-primary bg-primary p-7 text-white shadow-xl shadow-primary/20 sm:p-8"
					: "rounded-[1.75rem] border border-slate-200 bg-white p-7 text-slate-950 sm:p-8"
			}
		>
			<span
				className={
					featured
						? "grid size-12 place-items-center rounded-2xl bg-white/15"
						: "grid size-12 place-items-center rounded-2xl bg-blue-100 text-primary"
				}
			>
				<Icon className="size-6" />
			</span>
			<h3 className="mt-7 text-2xl font-black">{title}</h3>
			<p className={featured ? "mt-3 leading-7 text-blue-100" : "mt-3 leading-7 text-slate-600"}>
				{detail}
			</p>
			<ul className="mt-7 space-y-3">
				{points.map((point) => (
					<li key={point} className="flex gap-3 text-sm font-semibold">
						<Check
							className={
								featured
									? "mt-0.5 size-4 shrink-0 text-blue-200"
									: "mt-0.5 size-4 shrink-0 text-emerald-600"
							}
						/>
						{point}
					</li>
				))}
			</ul>
		</article>
	);
}
function SecurityPoint({ title, detail }: { title: string; detail: string }) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
			<div className="flex items-center gap-2 font-black text-slate-950">
				<CheckCircle2 className="size-5 text-emerald-600" />
				{title}
			</div>
			<p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
		</div>
	);
}
