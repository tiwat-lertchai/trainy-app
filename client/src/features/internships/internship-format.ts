export function formatWorkMode(mode: "onsite" | "hybrid" | "remote", locale = "th") {
	const labels =
		locale === "th"
			? { onsite: "ทำงานที่สถานประกอบการ", hybrid: "ไฮบริด", remote: "ทำงานทางไกล" }
			: { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" };
	return labels[mode];
}

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
