/* eslint-disable react-refresh/only-export-components -- TanStack Router requires the route export beside its page component. */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	BriefcaseBusiness,
	CheckCircle2,
	ChevronDown,
	Clock3,
	FileCheck2,
	Languages,
	Menu,
	ShieldCheck,
	UsersRound,
	X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import { signInWithLine } from "@/lib/auth-client";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
	const { locale, setLocale, t } = useLanguage();
	const [menuOpen, setMenuOpen] = useState(false);
	const [signingIn, setSigningIn] = useState(false);

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
			<header className="relative z-20 border-b border-border/70 bg-white/85 backdrop-blur-xl">
				<div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
					<BrandMark />
					<nav
						className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex"
						aria-label="Primary navigation"
					>
						<a className="hover:text-foreground" href="#features">
							{t("nav.features")}
						</a>
						<a className="hover:text-foreground" href="#workflow">
							{t("nav.workflow")}
						</a>
						<a className="hover:text-foreground" href="#security">
							{t("nav.security")}
						</a>
					</nav>
					<div className="hidden items-center gap-3 md:flex">
						<LanguageToggle locale={locale} onChange={setLocale} />
						<Button onClick={handleSignIn} disabled={signingIn}>
							{t("auth.signIn")}
						</Button>
					</div>
					<Button
						className="md:hidden"
						variant="ghost"
						size="icon"
						aria-label="Toggle navigation"
						onClick={() => setMenuOpen((open) => !open)}
					>
						{menuOpen ? <X /> : <Menu />}
					</Button>
				</div>
				{menuOpen && (
					<div className="border-t bg-white px-5 py-5 md:hidden">
						<div className="grid gap-3">
							<LanguageToggle locale={locale} onChange={setLocale} />
							<Button onClick={handleSignIn} disabled={signingIn}>
								{t("auth.signIn")}
							</Button>
						</div>
					</div>
				)}
			</header>

			<main>
				<section className="relative">
					<div className="hero-grid absolute inset-0 opacity-55" />
					<div className="pointer-events-none absolute -left-32 top-10 size-96 rounded-full bg-primary/10 blur-3xl" />
					<div className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-accent/10 blur-3xl" />
					<div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
						<div className="max-w-2xl">
							<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary">
								<span className="size-2 rounded-full bg-accent" />
								{t("hero.eyebrow")}
							</div>
							<h1 className="text-balance text-4xl font-black leading-[1.12] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
								{t("hero.title")}
							</h1>
							<p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
								{t("hero.description")}
							</p>
							<div className="mt-8 flex flex-col gap-3 sm:flex-row">
								<Button size="lg" onClick={handleSignIn} disabled={signingIn}>
									{t("hero.primary")}
									<ArrowRight />
								</Button>
								<Button size="lg" variant="outline" asChild>
									<a href="#workflow">{t("hero.secondary")}</a>
								</Button>
							</div>
							<p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
								<ShieldCheck className="size-4 text-accent" />
								{t("hero.note")}
							</p>
						</div>
						<DashboardPreview />
					</div>
				</section>

				<section id="workflow" className="border-y bg-white py-16 sm:py-20">
					<div id="features" className="mx-auto grid max-w-7xl gap-5 px-5 sm:px-8 md:grid-cols-3">
						<TrustCard
							icon={FileCheck2}
							title={t("trust.workflow")}
							detail={t("trust.workflowDetail")}
						/>
						<TrustCard icon={UsersRound} title={t("trust.roles")} detail={t("trust.rolesDetail")} />
						<TrustCard
							id="security"
							icon={ShieldCheck}
							title={t("trust.secure")}
							detail={t("trust.secureDetail")}
						/>
					</div>
				</section>
			</main>
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
			className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-muted"
			onClick={() => onChange(locale === "th" ? "en" : "th")}
			aria-label="Change language"
		>
			<Languages className="size-4" />
			{locale.toUpperCase()}
			<ChevronDown className="size-3.5 text-muted-foreground" />
		</button>
	);
}

function DashboardPreview() {
	const { t } = useLanguage();
	return (
		<div className="mx-auto w-full max-w-2xl rounded-[1.6rem] border border-white/70 bg-white/75 p-2 shadow-[0_30px_80px_-30px_rgba(18,35,63,0.35)] backdrop-blur-xl">
			<div className="overflow-hidden rounded-[1.15rem] border bg-[#f7f9fc]">
				<div className="flex items-center justify-between border-b bg-white px-5 py-4">
					<BrandMark className="origin-left scale-90" />
					<div className="flex items-center gap-2">
						<span className="size-8 rounded-full bg-[#edf3ff]" />
						<span className="hidden text-sm font-semibold sm:block">Narin S.</span>
					</div>
				</div>
				<div className="p-5 sm:p-7">
					<h2 className="text-xl font-bold sm:text-2xl">{t("preview.heading")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("preview.subheading")}</p>
					<div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">
						<Metric icon={BriefcaseBusiness} label={t("preview.active")} value="1" />
						<Metric icon={Clock3} label={t("preview.hours")} value="128" />
						<Metric icon={BarChart3} label={t("preview.progress")} value="64%" />
					</div>
					<div className="mt-5 rounded-xl border bg-white p-4 sm:p-5">
						<h3 className="font-bold">{t("preview.next")}</h3>
						<div className="mt-3 space-y-3">
							<ActionItem title={t("preview.task1")} due={t("preview.today")} urgent />
							<ActionItem title={t("preview.task2")} due={t("preview.friday")} />
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
		<div className="rounded-xl border bg-white p-3 sm:p-4">
			<Icon className="size-4 text-primary sm:size-5" />
			<p className="mt-3 text-xl font-extrabold sm:text-2xl">{value}</p>
			<p className="mt-1 line-clamp-1 text-[10px] text-muted-foreground sm:text-xs">{label}</p>
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
		<div className="flex items-center gap-3">
			<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#edf3ff] text-primary">
				<CheckCircle2 className="size-4" />
			</span>
			<span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">{title}</span>
			<span
				className={
					urgent ? "text-xs font-semibold text-destructive" : "text-xs text-muted-foreground"
				}
			>
				{due}
			</span>
		</div>
	);
}

function TrustCard({
	icon: Icon,
	title,
	detail,
	id,
}: {
	icon: typeof ShieldCheck;
	title: string;
	detail: string;
	id?: string;
}) {
	return (
		<article id={id} className="rounded-2xl border bg-background p-6">
			<span className="grid size-11 place-items-center rounded-xl bg-[#edf3ff] text-primary">
				<Icon className="size-5" />
			</span>
			<h2 className="mt-5 text-lg font-bold">{title}</h2>
			<p className="mt-2 leading-7 text-muted-foreground">{detail}</p>
		</article>
	);
}
