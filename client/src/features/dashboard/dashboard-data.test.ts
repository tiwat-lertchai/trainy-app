import { describe, expect, test } from "bun:test";
import {
	dashboardProgressIndex,
	dashboardExperienceForRole,
	dashboardFromReport,
	dashboardFromWorkflow,
	liveDashboardQueryOptions,
} from "./dashboard-data";

describe("dashboard data", () => {
	test("assigns a distinct dashboard experience to each operational role group", () => {
		expect(dashboardExperienceForRole("student")).toBe("student");
		expect(dashboardExperienceForRole("advisor")).toBe("advisor");
		expect(dashboardExperienceForRole("coordinator")).toBe("university_operations");
		expect(dashboardExperienceForRole("university_admin")).toBe("university_operations");
		expect(dashboardExperienceForRole("company_admin")).toBe("company");
		expect(dashboardExperienceForRole("supervisor")).toBe("company");
	});
	test("refreshes live metrics on mount, focus, and a short interval", () => {
		expect(liveDashboardQueryOptions).toEqual({
			refetchOnMount: "always",
			refetchOnWindowFocus: true,
			refetchInterval: 15_000,
		});
	});
	test("derives organization-admin metrics from the authorized report", () => {
		expect(
			dashboardFromReport({
				activeMembers: 9,
				internships: 4,
				applications: [
					{ status: "submitted", count: 3 },
					{ status: "accepted", count: 2 },
				],
				placements: [
					{ status: "pending", count: 1 },
					{ status: "active", count: 2 },
					{ status: "completed", count: 5 },
				],
			}),
		).toEqual({
			primaryValue: 8,
			primaryLabel: "placements",
			actionItems: 4,
			completedItems: 5,
			secondaryValue: 4,
			secondaryLabel: "internships",
		});
	});

	test("derives student metrics without exposing organization-wide data", () => {
		expect(
			dashboardFromWorkflow({
				role: "student",
				placements: [{ status: "active" }, { status: "completed" }],
				applications: [{ status: "submitted" }, { status: "withdrawn" }],
				requests: [{ status: "submitted" }],
				organizationCount: 1,
			}),
		).toEqual({
			primaryValue: 3,
			primaryLabel: "requests",
			actionItems: 1,
			completedItems: 1,
			secondaryValue: 1,
			secondaryLabel: "organizations",
			nextAction: "awaitRequestReview",
		});
	});

	test("maps the student's real next action to the visible journey stage", () => {
		const base = {
			primaryValue: 1,
			primaryLabel: "requests" as const,
			actionItems: 1,
			completedItems: 0,
			secondaryValue: 1,
			secondaryLabel: "organizations" as const,
		};

		expect(dashboardProgressIndex({ ...base, nextAction: "editRequest" }, "student")).toBe(0);
		expect(dashboardProgressIndex({ ...base, nextAction: "awaitRequestReview" }, "student")).toBe(
			1,
		);
		expect(dashboardProgressIndex({ ...base, nextAction: "placements" }, "student")).toBe(2);
		expect(dashboardProgressIndex({ ...base, actionItems: 0, completedItems: 1 }, "student")).toBe(
			3,
		);
	});

	test("uses a compact queue stage for staff dashboards", () => {
		const snapshot = dashboardFromReport({
			activeMembers: 9,
			applications: [{ status: "submitted", count: 2 }],
			placements: [],
		});
		expect(dashboardProgressIndex(snapshot, "advisor")).toBe(1);
	});
});
