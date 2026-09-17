import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ContactRound, HeartPulse, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import { apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { loadStudentProfile } from "./student-profile-api";

type StudentProfilePayload = {
	dateOfBirth: string;
	gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
	address: string;
	cumulativeGpa: number;
	lastTermGpa: number;
	emergencyContactName: string;
	emergencyContactRelationship: string;
	emergencyContactPhone: string;
	bloodType: "A" | "B" | "AB" | "O" | "unknown";
	medicalConditions: string;
	allergies: string;
	medications: string;
	accessibilityNeeds: string;
};

export function StudentProfilePage() {
	const { t } = useLanguage();
	const queryClient = useQueryClient();
	const session = authClient.useSession();
	const profile = useQuery({ queryKey: ["student-profile", "me"], queryFn: loadStudentProfile });
	const [saved, setSaved] = useState(false);
	const save = useMutation({
		mutationFn: async (json: StudentProfilePayload) => {
			const response = await apiClient.api.v1["student-profile"].me.$put({ json });
			if (!response.ok) throw new Error("STUDENT_PROFILE_SAVE_FAILED");
			return response.json();
		},
		onSuccess: async () => {
			setSaved(true);
			await queryClient.invalidateQueries({ queryKey: ["student-profile", "me"] });
		},
	});

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaved(false);
		const data = new FormData(event.currentTarget);
		const value = (key: string) => String(data.get(key) ?? "").trim();
		save.mutate({
			dateOfBirth: value("dateOfBirth"),
			gender: value("gender") as "female" | "male" | "non_binary" | "prefer_not_to_say",
			address: value("address"),
			cumulativeGpa: Number(value("cumulativeGpa")),
			lastTermGpa: Number(value("lastTermGpa")),
			emergencyContactName: value("emergencyContactName"),
			emergencyContactRelationship: value("emergencyContactRelationship"),
			emergencyContactPhone: value("emergencyContactPhone"),
			bloodType: value("bloodType") as "A" | "B" | "AB" | "O" | "unknown",
			medicalConditions: value("medicalConditions"),
			allergies: value("allergies"),
			medications: value("medications"),
			accessibilityNeeds: value("accessibilityNeeds"),
		});
	}

	if (profile.isLoading)
		return <p className="text-muted-foreground">{t("studentProfile.loading")}</p>;
	if (profile.isError)
		return (
			<div role="alert" className="rounded-2xl border border-destructive/20 bg-card p-6">
				<p className="font-semibold text-destructive">{t("studentProfile.loadError")}</p>
				<Button className="mt-4" variant="outline" onClick={() => profile.refetch()}>
					{t("common.retry")}
				</Button>
			</div>
		);
	const current = profile.data?.data;
	return (
		<div className="mx-auto max-w-3xl">
			<p className="text-sm font-semibold text-primary">{t("studentProfile.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("studentProfile.title")}</h1>
			<p className="mt-2 text-muted-foreground">{t("studentProfile.description")}</p>
			<div className="mt-5 flex gap-3 rounded-xl border border-info/30 bg-info-muted p-4 text-sm text-info-foreground">
				<ShieldCheck className="size-5 shrink-0" />
				<p>{t("studentProfile.privacy")}</p>
			</div>
			<section className="mt-6 rounded-2xl border bg-card p-6">
				<div className="flex items-center gap-3">
					<span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
						<UserRound className="size-5" />
					</span>
					<div>
						<h2 className="font-bold">{t("studentProfile.accountHeading")}</h2>
						<p className="text-sm text-muted-foreground">
							{t("studentProfile.accountDescription")}
						</p>
					</div>
				</div>
				<dl className="mt-5 grid gap-4 sm:grid-cols-2">
					<div className="rounded-xl bg-muted p-4">
						<dt className="text-xs font-semibold text-muted-foreground">
							{t("studentProfile.accountName")}
						</dt>
						<dd className="mt-1 font-semibold">{session.data?.user.name ?? "—"}</dd>
					</div>
					<div className="rounded-xl bg-muted p-4">
						<dt className="text-xs font-semibold text-muted-foreground">
							{t("studentProfile.accountEmail")}
						</dt>
						<dd className="mt-1 break-all font-semibold">{session.data?.user.email ?? "—"}</dd>
					</div>
				</dl>
			</section>
			<form
				key={current?.updatedAt ?? "empty"}
				className="mt-6 grid gap-5 rounded-2xl border bg-card p-6 sm:grid-cols-2"
				onSubmit={handleSubmit}
			>
				<div className="flex items-center gap-2 font-bold sm:col-span-2">
					<UserRound className="size-5 text-primary" />
					{t("studentProfile.personalHeading")}
				</div>
				<Field
					name="dateOfBirth"
					label={t("studentProfile.dateOfBirth")}
					type="date"
					defaultValue={current?.dateOfBirth}
				/>
				<Select
					name="gender"
					label={t("studentProfile.gender")}
					defaultValue={current?.gender}
					options={["female", "male", "non_binary", "prefer_not_to_say"]}
					t={t}
					prefix="studentProfile.gender"
				/>
				<Field
					name="address"
					label={t("studentProfile.address")}
					defaultValue={current?.address}
					wide
				/>
				<div className="sm:col-span-2 mt-2 flex items-center gap-2 border-t pt-5 font-bold">
					<BookOpen className="size-5 text-primary" />
					{t("studentProfile.academicHeading")}
				</div>
				<p className="text-sm text-muted-foreground sm:col-span-2">
					{t("studentProfile.academicDescription")}
				</p>
				<Field
					name="cumulativeGpa"
					label={t("academic.cumulativeGpa")}
					type="number"
					defaultValue={current?.cumulativeGpa}
					min="0"
					max="4"
					step="0.01"
				/>
				<Field
					name="lastTermGpa"
					label={t("academic.latestGpa")}
					type="number"
					defaultValue={current?.lastTermGpa}
					min="0"
					max="4"
					step="0.01"
				/>
				<div className="sm:col-span-2 mt-2 flex items-center gap-2 border-t pt-5 font-bold">
					<ContactRound className="size-5 text-primary" />
					{t("studentProfile.emergencyHeading")}
				</div>
				<Field
					name="emergencyContactName"
					label={t("studentProfile.emergencyName")}
					defaultValue={current?.emergencyContactName}
				/>
				<Field
					name="emergencyContactRelationship"
					label={t("studentProfile.emergencyRelationship")}
					defaultValue={current?.emergencyContactRelationship}
				/>
				<Field
					name="emergencyContactPhone"
					label={t("studentProfile.emergencyPhone")}
					defaultValue={current?.emergencyContactPhone}
				/>
				<Select
					name="bloodType"
					label={t("studentProfile.bloodType")}
					defaultValue={current?.bloodType}
					options={["A", "B", "AB", "O", "unknown"]}
					t={t}
					prefix="studentProfile.blood"
				/>
				<div className="sm:col-span-2 mt-2 flex items-center gap-2 border-t pt-5 font-bold">
					<HeartPulse className="size-5 text-primary" />
					{t("studentProfile.healthHeading")}
				</div>
				{(["medicalConditions", "allergies", "medications", "accessibilityNeeds"] as const).map(
					(name) => (
						<Field
							key={name}
							name={name}
							label={t(`studentProfile.${name}`)}
							defaultValue={current?.[name]}
							placeholder={t("studentProfile.noneHint")}
							wide
						/>
					),
				)}
				{save.isError && (
					<p role="alert" className="text-sm text-destructive sm:col-span-2">
						{t("studentProfile.saveError")}
					</p>
				)}
				{saved && (
					<p role="status" className="text-sm text-success-foreground sm:col-span-2">
						{t("studentProfile.saved")}
					</p>
				)}
				<Button className="sm:col-span-2" size="lg" disabled={save.isPending}>
					{t(save.isPending ? "studentProfile.saving" : "studentProfile.save")}
				</Button>
			</form>
		</div>
	);
}

function Field({
	name,
	label,
	defaultValue,
	type = "text",
	placeholder,
	wide = false,
	min,
	max,
	step,
}: {
	name: string;
	label: string;
	defaultValue?: string | null;
	type?: string;
	placeholder?: string;
	wide?: boolean;
	min?: string;
	max?: string;
	step?: string;
}) {
	return (
		<label className={`grid gap-2 text-sm font-semibold ${wide ? "sm:col-span-2" : ""}`}>
			{label}
			<input
				name={name}
				type={type}
				defaultValue={defaultValue ?? ""}
				placeholder={placeholder}
				required
				min={min}
				max={max}
				step={step}
				maxLength={type === "text" ? 1000 : undefined}
				className="h-11 rounded-xl border bg-background px-3 font-normal"
			/>
		</label>
	);
}

function Select({
	name,
	label,
	defaultValue,
	options,
	t,
	prefix,
}: {
	name: string;
	label: string;
	defaultValue?: string;
	options: string[];
	t: (key: MessageKey) => string;
	prefix: string;
}) {
	return (
		<label className="grid gap-2 text-sm font-semibold">
			{label}
			<select
				name={name}
				required
				defaultValue={defaultValue ?? ""}
				className="h-11 rounded-xl border bg-background px-3 font-normal"
			>
				<option value="" disabled>
					{t("studentProfile.select")}
				</option>
				{options.map((option) => (
					<option key={option} value={option}>
						{t(`${prefix}.${option}` as MessageKey)}
					</option>
				))}
			</select>
		</label>
	);
}
