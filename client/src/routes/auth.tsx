/* eslint-disable react-refresh/only-export-components -- TanStack Router requires the route export beside its page component. */
import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { authClient, signInWithLine } from "@/lib/auth-client";

export const Route = createFileRoute("/auth")({ component: AuthPage });
export type AuthMode = "sign-in" | "sign-up" | "forgot";

function AuthPage() {
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [pending, setPending] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setError("");
		setMessage("");
		const data = new FormData(event.currentTarget);
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const password = String(data.get("password") ?? "");

		try {
			if (mode === "forgot") {
				const result = await authClient.requestPasswordReset({
					email,
					redirectTo: `${window.location.origin}/reset-password`,
				});
				if (result.error) throw new Error(`${result.error.status} ${result.error.message}`);
				setMessage("ถ้ามีบัญชีนี้ เราส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว กรุณาตรวจสอบอีเมล");
				return;
			}

			if (mode === "sign-up") {
				const result = await authClient.signUp.email({
					name: String(data.get("name") ?? "").trim(),
					email,
					password,
					callbackURL: `${window.location.origin}/app`,
				});
				if (result.error) throw new Error(result.error.message);
				setMessage("สร้างบัญชีแล้ว กรุณาเปิดอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ");
				return;
			}

			const result = await authClient.signIn.email({
				email,
				password,
				callbackURL: `${window.location.origin}/app`,
				rememberMe: true,
			});
			if (result.error) throw new Error(result.error.message);
			window.location.assign("/app");
		} catch (cause) {
			setError(authErrorMessage(cause));
		} finally {
			setPending(false);
		}
	}

	return (
		<main className="grid min-h-screen bg-background lg:grid-cols-[0.9fr_1.1fr]">
			<section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
				<div className="flex items-center justify-between">
					<Link to="/" aria-label="กลับหน้าหลัก">
						<BrandMark />
					</Link>
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
					>
						<ArrowLeft className="size-4" /> กลับหน้าหลัก
					</Link>
				</div>
				<div className="mx-auto my-auto w-full max-w-md py-16">
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
						Trainy account
					</p>
					<h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{modeTitle(mode)}</h1>
					<p className="mt-3 leading-7 text-muted-foreground">{modeDescription(mode)}</p>

					{mode !== "forgot" && (
						<Button
							variant="outline"
							className="mt-8 h-12 w-full rounded-full"
							onClick={() => void signInWithLine()}
							disabled={pending}
						>
							เข้าสู่ระบบ
						</Button>
					)}
					{mode !== "forgot" && (
						<div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
							<span className="h-px flex-1 bg-border" />
							หรือใช้อีเมล
							<span className="h-px flex-1 bg-border" />
						</div>
					)}

					<form className="space-y-4" onSubmit={submit}>
						{mode === "sign-up" && (
							<Field label="ชื่อที่ใช้ใน Trainy" name="name" autoComplete="name" required />
						)}
						<Field label="อีเมล" name="email" type="email" autoComplete="email" required />
						{mode !== "forgot" && (
							<Field
								label="รหัสผ่าน"
								name="password"
								type="password"
								autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
								minLength={12}
								maxLength={128}
								required
								hint={mode === "sign-up" ? "อย่างน้อย 12 ตัวอักษร" : undefined}
							/>
						)}
						{error && (
							<p
								role="alert"
								className="rounded-xl bg-destructive-muted px-4 py-3 text-sm text-destructive"
							>
								{error}
							</p>
						)}
						{message && (
							<p
								role="status"
								className="rounded-xl bg-success-muted px-4 py-3 text-sm text-success-foreground"
							>
								{message}
							</p>
						)}
						<Button className="h-12 w-full rounded-full" disabled={pending}>
							{pending ? "กำลังดำเนินการ..." : modeAction(mode)}
							<ArrowRight />
						</Button>
					</form>

					<div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold">
						{mode === "sign-in" && (
							<>
								<button
									className="text-muted-foreground hover:text-foreground"
									onClick={() => setMode("forgot")}
								>
									ลืมรหัสผ่าน?
								</button>
								<button
									className="text-muted-foreground hover:text-foreground"
									onClick={() => setMode("sign-up")}
								>
									สร้างบัญชีใหม่
								</button>
							</>
						)}
						{mode !== "sign-in" && (
							<button
								className="text-muted-foreground hover:text-foreground"
								onClick={() => setMode("sign-in")}
							>
								กลับไปเข้าสู่ระบบ
							</button>
						)}
					</div>
				</div>
			</section>
			<aside className="relative hidden overflow-hidden bg-sidebar p-16 text-sidebar-foreground lg:flex lg:flex-col lg:justify-end">
				<div className="absolute -right-32 -top-24 size-[34rem] rounded-full bg-sidebar-primary" />
				<div className="relative max-w-xl">
					<ShieldCheck className="size-11 text-sidebar-primary" />
					<h2 className="mt-8 text-5xl font-semibold leading-tight tracking-[-0.055em]">
						บัญชีเดียว สำหรับทุกวันที่คุณเติบโต
					</h2>
					<p className="mt-5 max-w-md leading-7 text-sidebar-foreground/60">
						ยืนยันอีเมลก่อนใช้งาน จำกัดการลองรหัสผ่าน และยกเลิก session เดิมเมื่อตั้งรหัสใหม่
					</p>
				</div>
			</aside>
		</main>
	);
}

function Field({
	label,
	hint,
	...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
	return (
		<label className="block text-sm font-semibold">
			{label}
			<input
				{...props}
				className="mt-2 h-12 w-full rounded-xl border border-input bg-card px-4 font-normal outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/20"
			/>
			{hint && (
				<span className="mt-1.5 block text-xs font-normal text-muted-foreground">{hint}</span>
			)}
		</label>
	);
}

function modeTitle(mode: AuthMode) {
	if (mode === "sign-up") return "สร้างบัญชีใหม่";
	if (mode === "forgot") return "ตั้งรหัสผ่านใหม่";
	return "ยินดีต้อนรับกลับมา";
}
function modeDescription(mode: AuthMode) {
	if (mode === "sign-up") return "เริ่มเก็บเรื่องราวการฝึกงาน และยืนยันตัวตนผ่านอีเมลของคุณ";
	if (mode === "forgot")
		return "กรอกอีเมลของคุณ เราจะส่งลิงก์ที่ใช้ได้ครั้งเดียวและหมดอายุใน 30 นาที";
	return "เข้าสู่พื้นที่บันทึกการฝึกงานของคุณ";
}
function modeAction(mode: AuthMode) {
	if (mode === "sign-up") return "สร้างบัญชี";
	if (mode === "forgot") return "ส่งลิงก์ตั้งรหัสใหม่";
	return "เข้าสู่ระบบ";
}
export function authErrorMessage(cause: unknown) {
	const message = cause instanceof Error ? cause.message : "";
	if (message.toLowerCase().includes("rate") || message.includes("429"))
		return "ลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
	if (message.toLowerCase().includes("verify")) return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
	return "ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่";
}
