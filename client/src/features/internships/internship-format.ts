import type { MessageKey } from "@/i18n/messages";

export const workModeKeys = {
	onsite: "internships.workMode.onsite",
	hybrid: "internships.workMode.hybrid",
	remote: "internships.workMode.remote",
} satisfies Record<"onsite" | "hybrid" | "remote", MessageKey>;

export function canApply(deadline: string | Date, now = new Date()) {
	return new Date(deadline).getTime() > now.getTime();
}

export function availableInternshipActions(
	status: "draft" | "published" | "closed",
	isCompanyAdmin: boolean,
) {
	if (!isCompanyAdmin || status === "closed") return [];
	return status === "draft" ? (["published", "closed"] as const) : (["closed"] as const);
}
