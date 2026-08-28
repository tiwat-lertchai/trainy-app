import { describe, expect, test } from "bun:test";
import { dashboardFromReport, dashboardFromWorkflow } from "./dashboard-data";

describe("dashboard data", () => {
	test("derives organization-admin metrics from the authorized report", () => {
		expect(dashboardFromReport({
			activeMembers: 9,
			internships: 4,
			applications: [{ status: "submitted", count: 3 }, { status: "accepted", count: 2 }],
			placements: [{ status: "pending", count: 1 }, { status: "active", count: 2 }, { status: "completed", count: 5 }],
		})).toEqual({ primaryValue: 8, primaryLabel: "placements", actionItems: 4, completedItems: 5, secondaryValue: 4, secondaryLabel: "internships" });
	});

	test("derives student metrics without exposing organization-wide data", () => {
		expect(dashboardFromWorkflow({
			role: "student",
			placements: [{ status: "active" }, { status: "completed" }],
			applications: [{ status: "submitted" }, { status: "withdrawn" }],
			organizationCount: 1,
		})).toEqual({ primaryValue: 2, primaryLabel: "applications", actionItems: 1, completedItems: 1, secondaryValue: 1, secondaryLabel: "organizations" });
	});
});
