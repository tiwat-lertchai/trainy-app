/* eslint-disable react-refresh/only-export-components -- TanStack Router requires the route export beside its page component. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	BellRing,
	Building2,
	Check,
	CheckCircle2,
	ChevronDown,
	GraduationCap,
	Languages,
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
		<div className="min-h-screen overflow-hidden bg-background">
			<header className="relative z-50 bg-background">
				<div className="mx-auto flex h-[78px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
					<a href="#top" aria-label="Trainy home">
						<BrandMark />
					</a>
					<nav
						className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground lg:flex"
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
						<Button className="h-10 rounded-full px-5" onClick={handleSignIn} disabled={signingIn}>
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
					<div id="mobile-menu" className="border-t border-border bg-card px-5 py-5 md:hidden">
						<nav className="grid gap-1" aria-label="Mobile navigation">
							{landingSections.map((section) => (
								<a
									key={section}
									className="rounded-xl px-4 py-3 font-semibold text-foreground hover:bg-muted"
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

			<main id="top">
				<section className="relative isolate overflow-hidden">
					<div className="relative mx-auto grid min-h-[710px] max-w-[1180px] items-center gap-10 px-5 pb-24 pt-12 sm:px-8 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14 lg:pb-24 lg:pt-16">
						<div className="max-w-2xl">
							<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/30 py-1.5 pl-2 pr-3 text-sm font-medium text-muted-foreground">
								<span className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
									<Sparkles className="size-3.5" />
								</span>
								{t("hero.eyebrow")}
							</div>
							<h1 className="max-w-[700px] text-balance text-[3.35rem] font-semibold leading-[0.97] tracking-[-0.07em] text-foreground sm:text-7xl lg:text-[5.35rem]">
								{t("hero.title")}
							</h1>
							<p className="mt-7 max-w-[550px] text-pretty text-lg leading-8 text-muted-foreground">
								{t("hero.description")}
							</p>
							<div className="mt-9 flex flex-col gap-3 sm:flex-row">
								<Button
									size="lg"
									className="h-13 rounded-full px-6 text-base"
									onClick={handleSignIn}
									disabled={signingIn}
								>
									{t("hero.primary")}
									<ArrowRight />
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="h-13 rounded-full border-border bg-card/20 px-6 text-base"
									asChild
								>
									<a href="#workflow">{t("hero.secondary")}</a>
								</Button>
							</div>
							<div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
								<MiniCheck text={t("hero.note")} />
								<MiniCheck text={t("hero.responsive")} />
							</div>
						</div>
						<DashboardPreview />
					</div>
					<div className="border-y border-border bg-card/20 py-6">
						<div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 text-sm font-semibold text-muted-foreground sm:px-8">
							<span>{t("features.actionTitle")}</span>
							<i className="size-2 rounded-full bg-accent" />
							<span>{t("features.progressTitle")}</span>
							<i className="size-2 rounded-full bg-accent" />
							<span>{t("features.documentsTitle")}</span>
							<i className="size-2 rounded-full bg-accent" />
							<span>{t("features.rolesTitle")}</span>
						</div>
					</div>
				</section>

				<section id="features" className="scroll-mt-18 py-28 sm:py-32">
					<div id="why" className="mx-auto max-w-[1180px] scroll-mt-8 px-5 sm:px-8">
						<div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
							<p className="pt-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
								{t("features.eyebrow")}
							</p>
							<h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl">
								{t("features.title")}
							</h2>
						</div>
						<div className="mt-16 grid gap-4 md:grid-cols-3">
							<FeatureCard
								number="01"
								icon={GraduationCap}
								title={t("roles.student")}
								detail={t("roles.studentDetail")}
							/>
							<FeatureCard
								number="02"
								icon={UsersRound}
								title={t("roles.advisor")}
								detail={t("roles.advisorDetail")}
							/>
							<FeatureCard
								number="03"
								icon={Building2}
								title={t("roles.organization")}
								detail={t("roles.organizationDetail")}
							/>
						</div>
					</div>
				</section>

				<section
					id="workflow"
					className="scroll-mt-18 border-y border-sidebar-border bg-sidebar py-22 text-sidebar-foreground sm:py-28"
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

				<section id="roles" className="scroll-mt-18 bg-background py-22 sm:py-28">
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

				<section id="security" className="scroll-mt-18 bg-card py-22 sm:py-28">
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
						<div className="relative overflow-hidden rounded-[2rem] bg-sidebar p-8 text-sidebar-foreground shadow-2xl shadow-foreground/15 sm:p-11">
							<div className="absolute -right-20 -top-20 size-64 rounded-full border-[44px] border-sidebar-border" />
							<ShieldCheck className="relative size-12" />
							<p className="relative mt-10 text-sm font-bold uppercase tracking-[0.18em] text-sidebar-primary">
								{t("security.cardEyebrow")}
							</p>
							<p className="relative mt-3 text-3xl font-black leading-tight sm:text-4xl">
								{t("security.cardTitle")}
							</p>
							<p className="relative mt-5 leading-7 text-sidebar-foreground/70">
								{t("security.cardDetail")}
							</p>
						</div>
					</div>
				</section>

				<section className="px-5 pb-8 sm:px-8 sm:pb-12">
					<div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-sidebar px-6 py-12 text-center text-sidebar-foreground sm:px-12 sm:py-16">
						<p className="text-sm font-bold uppercase tracking-[0.2em] text-sidebar-primary">
							{t("cta.eyebrow")}
						</p>
						<h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-black tracking-tight sm:text-5xl">
							{t("cta.title")}
						</h2>
						<p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-sidebar-foreground/70">
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
			<footer className="border-t border-border bg-card">
				<div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
					<BrandMark />
					<p className="text-sm text-muted-foreground">{t("footer.description")}</p>
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
			className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground transition hover:border-primary/30 hover:bg-accent hover:text-accent-foreground"
			onClick={() => onChange(locale === "th" ? "en" : "th")}
			aria-label="Change language"
		>
			<Languages className="size-4 text-primary" />
			{locale.toUpperCase()}
			<ChevronDown className="size-3.5 text-muted-foreground" />
		</button>
	);
}
function MiniCheck({ text }: { text: string }) {
	return (
		<span className="flex items-center gap-2">
			<span className="grid size-5 place-items-center rounded-full bg-success-muted text-success-foreground">
				<Check className="size-3" />
			</span>
			{text}
		</span>
	);
}
function DashboardPreview() {
	const { t } = useLanguage();
	return (
		<div className="relative mx-auto grid min-h-[560px] w-full place-items-center">
			<div className="absolute size-[430px] rounded-full bg-accent sm:size-[520px] lg:-right-8" />
			<div className="absolute right-0 top-4 hidden size-28 animate-[spin_18s_linear_infinite] place-items-center rounded-full border border-foreground/25 text-center text-[10px] font-bold tracking-[0.18em] lg:grid">
				LEARN · RECORD
				<br />
				GROW · REPEAT
			</div>
			<div className="relative w-[min(390px,90%)] rotate-[2.2deg] rounded-[42px] bg-sidebar p-3 text-sidebar-foreground shadow-[0_35px_70px_rgb(16_17_15_/_0.28)] transition duration-500 hover:-translate-y-1.5 hover:rotate-0">
				<div className="min-h-[560px] overflow-hidden rounded-[32px] bg-[#171914] p-5 sm:p-6">
					<div className="mb-7 flex justify-between px-1 text-xs text-sidebar-foreground/60">
						<span>09:41</span>
						<span>● ●● 100%</span>
					</div>
					<div className="mb-5">
						<p className="text-sm text-sidebar-foreground/65">{t("preview.workspace")}</p>
						<h2 className="mt-1 text-2xl font-semibold tracking-tight">{t("preview.heading")}</h2>
					</div>
					<div className="rounded-[23px] border border-sidebar-border bg-sidebar-accent p-5">
						<div className="flex items-start justify-between gap-4">
							<p className="font-semibold">{t("preview.next")}</p>
							<span className="rounded-full bg-sidebar-primary px-2.5 py-1 text-xs font-bold text-sidebar-primary-foreground">
								{t("preview.today")}
							</span>
						</div>
						<p className="mt-6 text-xl font-medium leading-snug">{t("preview.task1")}</p>
						<p className="mt-2 text-xs leading-5 text-sidebar-foreground/55">
							{t("preview.subheading")}
						</p>
						<div className="mt-5 rounded-xl bg-sidebar-primary py-3 text-center text-sm font-bold text-sidebar-primary-foreground">
							{t("hero.primary")} →
						</div>
					</div>
					<div className="mt-4 flex items-end justify-between rounded-[18px] bg-[#1d1f1a] p-4">
						<div>
							<p className="text-xs text-sidebar-foreground/55">{t("preview.hours")}</p>
							<strong className="text-xl">128</strong>
						</div>
						<div className="flex gap-1.5">
							{[0, 1, 2, 3, 4, 5, 6].map((day) => (
								<i
									key={day}
									className={`size-2 rounded-full ${day < 5 ? "bg-sidebar-primary" : "bg-sidebar-border"}`}
								/>
							))}
						</div>
					</div>
					<p className="mb-1 mt-5 px-1 text-[11px] font-medium uppercase tracking-[0.13em] text-sidebar-foreground/50">
						{t("preview.onTrack")}
					</p>
					<div className="flex gap-3 border-t border-sidebar-border px-1 py-3">
						<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-accent text-sidebar-primary">
							<ArrowRight className="size-4" />
						</span>
						<div>
							<strong className="block text-sm">{t("preview.active")}</strong>
							<small className="text-xs text-sidebar-foreground/50">
								{t("preview.journey")} · 64%
							</small>
						</div>
					</div>
				</div>
			</div>
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
						? "text-sm font-black uppercase tracking-[0.18em] text-sidebar-primary"
						: "text-sm font-black uppercase tracking-[0.18em] text-primary"
				}
			>
				{eyebrow}
			</p>
			<h2
				className={
					dark
						? "mt-4 text-balance text-3xl font-black tracking-tight text-sidebar-foreground sm:text-5xl"
						: "mt-4 text-balance text-3xl font-black tracking-tight text-foreground sm:text-5xl"
				}
			>
				{title}
			</h2>
			<p
				className={
					dark
						? "mt-5 text-lg leading-8 text-sidebar-foreground/70"
						: "mt-5 text-lg leading-8 text-muted-foreground"
				}
			>
				{description}
			</p>
		</div>
	);
}
function FeatureCard({
	number,
	icon: Icon,
	title,
	detail,
}: {
	number: string;
	icon: typeof BellRing;
	title: string;
	detail: string;
}) {
	return (
		<article className="group flex min-h-[320px] flex-col justify-between rounded-[22px] border border-border bg-card/30 p-7 transition duration-300 hover:-translate-y-1 hover:bg-card">
			<span className="text-xs text-muted-foreground">{number}</span>
			<div>
				<span className="mb-6 grid size-13 place-items-center rounded-2xl bg-primary text-accent">
					<Icon className="size-6" />
				</span>
				<h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
				<p className="mt-3 leading-7 text-muted-foreground">{detail}</p>
			</div>
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
		<article className="relative border-l border-sidebar-border pl-6 md:border-l-0 md:border-t md:pl-0 md:pt-8">
			<span className="absolute -left-3 top-0 grid size-6 place-items-center rounded-full bg-sidebar-primary text-[9px] font-black text-sidebar-primary-foreground md:-top-3 md:left-0">
				{number}
			</span>
			<h3 className="text-lg font-black">{title}</h3>
			<p className="mt-3 text-sm leading-6 text-sidebar-foreground/60">{detail}</p>
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
					? "rounded-[1.75rem] border border-sidebar-border bg-sidebar p-7 text-sidebar-foreground shadow-xl shadow-foreground/15 sm:p-8"
					: "rounded-[1.75rem] border border-border bg-card p-7 text-foreground sm:p-8"
			}
		>
			<span
				className={
					featured
						? "grid size-12 place-items-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground"
						: "grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground"
				}
			>
				<Icon className="size-6" />
			</span>
			<h3 className="mt-7 text-2xl font-black">{title}</h3>
			<p
				className={
					featured
						? "mt-3 leading-7 text-sidebar-foreground/70"
						: "mt-3 leading-7 text-muted-foreground"
				}
			>
				{detail}
			</p>
			<ul className="mt-7 space-y-3">
				{points.map((point) => (
					<li key={point} className="flex gap-3 text-sm font-semibold">
						<Check
							className={
								featured
									? "mt-0.5 size-4 shrink-0 text-sidebar-primary"
									: "mt-0.5 size-4 shrink-0 text-success"
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
		<div className="rounded-2xl border border-border bg-muted p-5">
			<div className="flex items-center gap-2 font-black text-foreground">
				<CheckCircle2 className="size-5 text-success" />
				{title}
			</div>
			<p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
		</div>
	);
}
