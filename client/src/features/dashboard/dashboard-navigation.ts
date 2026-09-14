export const dashboardNavigationLinks = {
	overview: "/app",
	requests: "/app/applications",
	internship: "/app/placements",
	approvals: "/app/applications",
	profile: "/app/profile",
	internships: "/app/internships",
	applications: "/app/applications",
	placements: "/app/placements",
	attendance: "/app/attendance",
	academic: "/app/academic",
	progress: "/app/progress",
	documents: "/app/documents",
	evaluations: "/app/evaluations",
	invites: "/app/invites",
	members: "/app/members",
	reports: "/app/reports",
} as const;

export const unavailableNavigationItems = ["history", "students"] as const;
