/* eslint-disable react-refresh/only-export-components -- TanStack Router requires the route export beside its page component. */
import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type ResetSearch = { token?: string; error?: string };
export const Route = createFileRoute("/reset-password")({
	validateSearch: (search: Record<string, unknown>): ResetSearch => ({
		token: typeof search.token === "string" ? search.token : undefined,
		error: typeof search.error === "string" ? search.error : undefined,
	}),
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token, error: tokenError } = Route.useSearch();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");
	const [complete, setComplete] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!token) return;
		const data = new FormData(event.currentTarget);
		const password = String(data.get("password") ?? "");
		const confirmation = String(data.get("confirmation") ?? "");
		if (password !== confirmation) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
		setPending(true);
		setError("");
		const result = await authClient.resetPassword({ newPassword: password, token });
		setPending(false);
		if (result.error) return setError("ลิงก์หมดอายุหรือไม่สามารถใช้งานได้ กรุณาขอลิงก์ใหม่");
		setComplete(true);
	}

	return (
		<main className="grid min-h-screen place-items-center bg-background px-5 py-12">
			<section className="w-full max-w-md rounded-[2rem] border border-border bg-card p-7 shadow-xl shadow-foreground/5 sm:p-10">
				<BrandMark />
				{complete ? (
					<div className="mt-12 text-center">
						<CheckCircle2 className="mx-auto size-12 text-success" />
						<h1 className="mt-5 text-3xl font-semibold tracking-tight">ตั้งรหัสผ่านใหม่แล้ว</h1>
						<Button asChild className="mt-7 rounded-full">
							<Link to="/auth">เข้าสู่ระบบ</Link>
						</Button>
					</div>
				) : (
					<>
						<Link
							to="/auth"
							className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"
						>
							<ArrowLeft className="size-4" /> กลับไปเข้าสู่ระบบ
						</Link>
						<h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em]">ตั้งรหัสผ่านใหม่</h1>
						{!token || tokenError ? (
							<p
								role="alert"
								className="mt-5 rounded-xl bg-destructive-muted p-4 text-sm text-destructive"
							>
								ลิงก์นี้หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่
							</p>
						) : (
							<form className="mt-7 space-y-4" onSubmit={submit}>
								<PasswordField name="password" label="รหัสผ่านใหม่" />
								<PasswordField name="confirmation" label="ยืนยันรหัสผ่านใหม่" />
								{error && (
									<p
										role="alert"
										className="rounded-xl bg-destructive-muted p-4 text-sm text-destructive"
									>
										{error}
									</p>
								)}
								<Button className="h-12 w-full rounded-full" disabled={pending}>
									{pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
								</Button>
							</form>
						)}
					</>
				)}
			</section>
		</main>
	);
}

function PasswordField({ name, label }: { name: string; label: string }) {
	return (
		<label className="block text-sm font-semibold">
			{label}
			<input
				className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
				type="password"
				name={name}
				minLength={12}
				maxLength={128}
				autoComplete="new-password"
				required
			/>
		</label>
	);
}
