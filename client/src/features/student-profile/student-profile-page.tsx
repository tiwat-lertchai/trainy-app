import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages";
import { apiClient } from "@/lib/api-client";
import { loadStudentProfile } from "./student-profile-api";

type StudentProfilePayload = {
	dateOfBirth: string;
	gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
	address: string;
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
			<p role="alert" className="rounded-xl bg-red-50 p-4 text-destructive">
				{t("studentProfile.loadError")}
			</p>
		);
	const current = profile.data?.data;
	return (
		<div className="mx-auto max-w-3xl">
			<p className="text-sm font-semibold text-primary">{t("studentProfile.eyebrow")}</p>
			<h1 className="mt-2 text-3xl font-black">{t("studentProfile.title")}</h1>
			<p className="mt-2 text-muted-foreground">{t("studentProfile.description")}</p>
			<div className="mt-5 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
				<ShieldCheck className="size-5 shrink-0" />
				<p>{t("studentProfile.privacy")}</p>
			</div>
			<form
				key={current?.updatedAt ?? "empty"}
				className="mt-6 grid gap-5 rounded-2xl border bg-white p-6 sm:grid-cols-2"
				onSubmit={handleSubmit}
			>
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
					<p role="status" className="text-sm text-emerald-700 sm:col-span-2">
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
}: {
	name: string;
	label: string;
	defaultValue?: string;
	type?: string;
	placeholder?: string;
	wide?: boolean;
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
