/* eslint-disable react-refresh/only-export-components -- TanStack Router requires the route export beside its page component. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	BellRing,
	BookOpenText,
	CalendarDays,
	Check,
	ChevronDown,
	Clock3,
	Languages,
	LineChart,
	ListChecks,
	Menu,
	Sparkles,
	TrendingUp,
	X,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";

export const Route = createFileRoute("/")({ component: LandingPage });
export const landingSections = ["features", "workflow"] as const;

function LandingPage() {
	const { locale, setLocale, t } = useLanguage();
	const [menuOpen, setMenuOpen] = useState(false);
	const editorial =
		locale === "th"
			? {
					heroEyebrow: "เพื่อนคู่คิดตลอดการฝึกงาน",
					heroTitle: "ทุกวันที่ลงมือทำ มีค่าให้จดจำ",
					heroDescription:
						"Trainy เปลี่ยนการเขียนบันทึกฝึกงานให้เป็นเรื่องง่าย ช่วยจัดลำดับสิ่งที่ควรทำ และทำให้คุณมองเห็นว่าตัวเองเติบโตมาไกลแค่ไหน",
					primary: "ดู Trainy ในหนึ่งวัน",
					secondary: "รู้จักแนวคิด",
					note: "ใช้เวลาเริ่มบันทึกได้เพียงเล็กน้อย",
					whyEyebrow: "ออกแบบเพื่อชีวิตจริง",
					whyTitle: "ไม่ใช่ฟอร์มที่ต้องส่ง แต่คือเรื่องราวที่อยากเก็บ",
					cards: [
						[
							"01 — เริ่มได้ทันที",
							"เริ่มเขียนได้ทันที",
							"หนึ่งคำถาม หนึ่งข้อความสั้น ไม่ต้องเผชิญแบบฟอร์มยาวก่อนจะได้เล่าเรื่องของวันนี้",
						],
						[
							"02 — ต่อเนื่องอย่างชัดเจน",
							"รู้ว่าควรทำอะไรต่อ",
							"Trainy จัดลำดับขั้นตอนให้เอง ตั้งแต่ลงเวลา บันทึกงาน ไปจนถึงทบทวนสิ่งที่ได้เรียนรู้",
						],
						[
							"03 — เห็นสิ่งที่มองข้าม",
							"เห็นความก้าวหน้าจริง",
							"ชั่วโมง ทักษะ และเรื่องเล่า ถูกทยอยสะสม ค่อย ๆ กลายเป็นภาพการเติบโตของคุณ",
						],
					],
					flowTitle: "หนึ่งวันของการฝึกงาน จบได้ในสามจังหวะ",
					flowDescription: "Trainy พาไปทีละขั้น โดยไม่ทำให้การบันทึกกลายเป็นภาระอีกชิ้นหนึ่ง",
					steps: [
						["ตอนเริ่มวัน", "เช็กอิน", "ลงเวลาและเห็นสิ่งสำคัญที่ควรทำในวันนี้"],
						[
							"ระหว่างวันหรือก่อนกลับ",
							"เก็บสิ่งที่ได้ทำ",
							"พิมพ์งานที่ทำ รูปภาพ หรือไอเดีย ๆ ได้ทันที",
						],
						[
							"เมื่อพร้อมทบทวน",
							"มองเห็นการเติบโต",
							"ย้อนดูชั่วโมง ทักษะ และเรื่องราวที่สะสมมาตลอดการฝึกงาน",
						],
					],
					quote: "Trainy ไม่ได้เตือนให้คุณทำรายงาน แต่ชวนให้คุณกลับมาเห็นตัวเองเติบโต",
					ready: "พร้อมเก็บวันแรกของคุณหรือยัง?",
					footer: "บันทึกการฝึกงาน © 2026",
				}
			: {
					heroEyebrow: "Your companion throughout the internship",
					heroTitle: "Every day you show up is worth remembering",
					heroDescription:
						"Trainy makes internship journaling effortless, guides what comes next, and helps you see how far you have grown.",
					primary: "A day with Trainy",
					secondary: "The idea",
					note: "Start a journal entry in moments",
					whyEyebrow: "Designed for real life",
					whyTitle: "Not another form to submit, but a story worth keeping",
					cards: [
						[
							"01 — Start instantly",
							"Write right away",
							"One prompt and one short note. No long form standing between you and today's story.",
						],
						[
							"02 — Clear continuity",
							"Know what comes next",
							"Trainy orders the journey—from checking in and capturing work to reflecting on what you learned.",
						],
						[
							"03 — Notice the unseen",
							"See real progress",
							"Hours, skills, and stories quietly accumulate into a picture of your growth.",
						],
					],
					flowTitle: "An internship day in three simple rhythms",
					flowDescription:
						"Trainy guides you one step at a time, without turning reflection into another chore.",
					steps: [
						["At the start", "Check in", "Log your arrival and see what matters today."],
						[
							"During the day",
							"Capture the work",
							"Save a task, photo, or idea the moment it happens.",
						],
						[
							"When you reflect",
							"See your growth",
							"Look back on the hours, skills, and stories gathered throughout your internship.",
						],
					],
					quote:
						"Trainy does not remind you to file a report. It invites you back to see yourself grow.",
					ready: "Ready to keep your first day?",
					footer: "Internship journal © 2026",
				};

	useEffect(() => {
		if (!menuOpen) return;
		const close = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
		window.addEventListener("keydown", close);
		return () => window.removeEventListener("keydown", close);
	}, [menuOpen]);

	function handleSignIn() {
		window.location.assign("/auth");
	}

	return (
		<div className="min-h-screen overflow-hidden bg-background">
			<header className="relative z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
				<div className="mx-auto flex h-[78px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
					<a href="#top" aria-label="Trainy home">
						<BrandMark />
					</a>
					<div className="hidden items-center gap-3 md:flex">
						<nav
							className="mr-4 hidden items-center gap-7 text-sm font-semibold text-muted-foreground lg:flex"
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
						<LanguageToggle locale={locale} onChange={setLocale} />
						<Button className="h-10 rounded-full px-5" onClick={handleSignIn}>
							{t("auth.signIn")}
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
							<Button className="h-11 rounded-xl" onClick={handleSignIn}>
								{t("auth.signIn")}
							</Button>
						</div>
					</div>
				)}
			</header>

			<main id="top">
				<section className="hero-grid relative isolate overflow-hidden">
					<div className="relative mx-auto grid min-h-[720px] max-w-[1240px] items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-12 lg:py-20">
						<div className="max-w-2xl">
							<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/30 py-1.5 pl-2 pr-3 text-sm font-medium text-muted-foreground">
								<span className="grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
									<Sparkles className="size-3.5" />
								</span>
								{editorial.heroEyebrow}
							</div>
							<h1 className="max-w-[650px] text-balance text-[3.1rem] font-semibold leading-[1.02] tracking-[-0.06em] text-foreground sm:text-7xl lg:text-[4.7rem]">
								{editorial.heroTitle}
							</h1>
							<p className="mt-7 max-w-[550px] text-pretty text-lg leading-8 text-muted-foreground">
								{editorial.heroDescription}
							</p>
							<div className="mt-9 flex flex-col gap-3 sm:flex-row">
								<Button
									size="lg"
									className="h-13 rounded-full px-6 text-base"
									onClick={handleSignIn}
								>
									{editorial.primary}
									<ArrowRight />
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="h-13 rounded-full border-border bg-card/20 px-6 text-base"
									asChild
								>
									<a href="#why">{editorial.secondary}</a>
								</Button>
							</div>
							<div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
								<MiniCheck text={editorial.note} />
							</div>
						</div>
						<WorkspacePreview />
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

				<section id="features" className="scroll-mt-18 py-24 sm:py-28">
					<div id="why" className="mx-auto max-w-[1180px] scroll-mt-8 px-5 sm:px-8">
						<div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
							<p className="pt-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
								{editorial.whyEyebrow}
							</p>
							<h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl">
								{editorial.whyTitle}
							</h2>
						</div>
						<div className="mt-14 grid gap-4 md:grid-cols-3">
							{editorial.cards.map(([number, title, detail], index) => (
								<FeatureCard
									key={number}
									number={number}
									icon={[ArrowRight, Menu, LineChart][index]}
									title={title}
									detail={detail}
								/>
							))}
						</div>
					</div>
				</section>

				<section
					id="workflow"
					className="scroll-mt-18 border-y border-border bg-muted/60 py-22 sm:py-28"
				>
					<div className="mx-auto max-w-[1180px] px-5 sm:px-8">
						<div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
							<h2 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl">
								{editorial.flowTitle}
							</h2>
							<p className="max-w-xs text-sm leading-6 text-muted-foreground">
								{editorial.flowDescription}
							</p>
						</div>
						<div className="mt-16 grid gap-8 md:grid-cols-3">
							{editorial.steps.map(([eyebrow, title, detail], index) => (
								<WorkflowStep
									key={title}
									number={`0${index + 1}`}
									eyebrow={eyebrow}
									title={title}
									detail={detail}
								/>
							))}
						</div>
					</div>
				</section>

				<section className="bg-accent py-24 text-accent-foreground sm:py-32">
					<div className="mx-auto max-w-[1180px] px-5 sm:px-8">
						<blockquote className="max-w-5xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl">
							{editorial.quote}
						</blockquote>
						<p className="mt-10 text-right text-sm font-bold">— Trainy design concept</p>
					</div>
				</section>
			</main>
			<footer className="bg-sidebar py-20 text-sidebar-foreground sm:py-24">
				<div className="mx-auto max-w-[1180px] px-5 sm:px-8">
					<div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
						<h2 className="max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-6xl">
							{editorial.ready}
						</h2>
						<Button
							className="h-12 rounded-full bg-sidebar-primary px-7 text-sidebar-primary-foreground hover:bg-sidebar-primary/88 hover:text-sidebar-primary-foreground active:bg-sidebar-primary/80 focus-visible:ring-sidebar-primary/55"
							onClick={handleSignIn}
						>
							{t("auth.signIn")}
							<ArrowRight />
						</Button>
					</div>
					<div className="mt-20 flex items-center justify-between border-t border-sidebar-border pt-6">
						<BrandMark className="text-sidebar-foreground" />
						<p className="text-xs text-sidebar-foreground/45">{editorial.footer}</p>
					</div>
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
function WorkspacePreview() {
	const { t } = useLanguage();
	return (
		<div className="relative mx-auto min-h-[570px] w-full max-w-[700px]">
			<div className="absolute -right-12 top-0 size-64 rounded-full bg-accent/75 blur-[1px] sm:size-80" />
			<div className="absolute -bottom-4 left-0 size-48 rounded-full border border-border bg-card/70" />
			<div className="absolute inset-x-0 top-7 overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_28px_80px_rgb(16_17_15_/_0.16)]">
				<div className="grid min-h-[520px] grid-cols-[74px_1fr] sm:grid-cols-[170px_1fr]">
					<aside className="flex flex-col border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground sm:p-4">
						<BrandMark className="mb-8 text-sidebar-foreground [&_span:last-child]:hidden sm:[&_span:last-child]:inline" />
						<div className="space-y-2">
							<PreviewNav icon={TrendingUp} label={t("nav.overview")} active />
							<PreviewNav icon={ListChecks} label={t("nav.requests")} />
							<PreviewNav icon={BookOpenText} label={t("nav.progress")} />
							<PreviewNav icon={CalendarDays} label={t("nav.history")} />
						</div>
						<div className="mt-auto hidden border-t border-sidebar-border pt-4 text-xs text-sidebar-foreground/60 sm:block">
							{t("preview.workspace")}
						</div>
					</aside>
					<div className="min-w-0 bg-background/55 p-4 sm:p-6">
						<div className="mb-6 flex items-start justify-between gap-3">
							<div>
								<p className="text-xs text-muted-foreground">{t("preview.workspace")}</p>
								<h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
									{t("preview.heading")}
								</h2>
							</div>
							<span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
								KT
							</span>
						</div>
						<div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
										{t("preview.onTrack")}
									</p>
									<p className="mt-2 font-semibold">{t("preview.active")}</p>
								</div>
								<span className="rounded-full bg-warning-muted px-2.5 py-1 text-[11px] font-bold text-warning-foreground">
									64%
								</span>
							</div>
							<div className="mt-5 grid grid-cols-4 gap-1.5" aria-hidden="true">
								{[0, 1, 2, 3].map((step) => (
									<div
										key={step}
										className={`h-1.5 rounded-full ${step < 3 ? "bg-accent" : "bg-muted"}`}
									/>
								))}
							</div>
						</div>
						<div className="mt-4 grid gap-4 sm:grid-cols-[1.25fr_0.75fr]">
							<div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
								<div className="flex items-center justify-between gap-3">
									<p className="text-sm font-semibold">{t("preview.next")}</p>
									<span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
										{t("preview.today")}
									</span>
								</div>
								<p className="mt-5 text-lg font-semibold leading-snug">{t("preview.task1")}</p>
								<p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
									{t("preview.subheading")}
								</p>
								<div className="mt-5 flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
									{t("hero.primary")} →
								</div>
							</div>
							<div className="grid gap-4">
								<PreviewMetric icon={Clock3} value="128" label={t("preview.hours")} />
								<PreviewMetric icon={LineChart} value="5/7" label={t("preview.journey")} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function PreviewNav({
	icon: Icon,
	label,
	active = false,
}: {
	icon: typeof BellRing;
	label: string;
	active?: boolean;
}) {
	return (
		<div
			className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold ${active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/60"}`}
		>
			<Icon className="size-4 shrink-0" />
			<span className="hidden truncate sm:block">{label}</span>
		</div>
	);
}

function PreviewMetric({
	icon: Icon,
	value,
	label,
}: {
	icon: typeof BellRing;
	value: string;
	label: string;
}) {
	return (
		<div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
			<Icon className="size-4 text-muted-foreground" />
			<strong className="mt-3 block text-xl tracking-tight">{value}</strong>
			<span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{label}</span>
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
		<article className="group flex min-h-[300px] flex-col justify-between rounded-[22px] border border-border bg-card p-7 shadow-[0_5px_20px_rgb(16_17_15_/_0.035)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgb(16_17_15_/_0.09)]">
			<span className="text-xs text-muted-foreground">{number}</span>
			<div>
				<span className="mb-6 grid size-13 place-items-center rounded-2xl bg-muted text-foreground transition group-hover:bg-accent group-hover:text-accent-foreground">
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
	eyebrow,
	title,
	detail,
}: {
	number: string;
	eyebrow: string;
	title: string;
	detail: string;
}) {
	return (
		<article className="relative border-l border-border pl-6 md:border-l-0 md:border-t md:pl-0 md:pt-8">
			<span className="absolute -left-3 top-0 grid size-6 place-items-center rounded-full bg-accent text-[9px] font-black text-accent-foreground md:-top-3 md:left-0">
				{number}
			</span>
			<p className="mb-2 text-xs text-muted-foreground">{eyebrow}</p>
			<h3 className="text-lg font-black">{title}</h3>
			<p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
		</article>
	);
}
