import { describe, expect, test } from "bun:test";
import { dashboardNavigationLinks } from "./dashboard-navigation";
import { getPrimaryNavigationForRole } from "@/features/organizations/role-navigation";

describe("dashboard navigation", () => {
	test("links the overview item to the dashboard route", () => {
		expect(dashboardNavigationLinks.overview).toBe("/app");
	});

	test("uses the required student primary navigation order", () => {
		expect(getPrimaryNavigationForRole("student")).toEqual([
			"overview",
			"requests",
			"internship",
			"history",
			"evaluations",
		]);
	});

	test("uses the required advisor primary navigation order", () => {
		expect(getPrimaryNavigationForRole("advisor")).toEqual([
			"overview",
			"approvals",
			"students",
			"evaluations",
		]);
	});

	test("maps only available requirement destinations to real routes", () => {
		expect(dashboardNavigationLinks.requests).toBe("/app/applications");
		expect(dashboardNavigationLinks.internship).toBe("/app/cwie");
		expect(dashboardNavigationLinks.approvals).toBe("/app/applications");
		expect(dashboardNavigationLinks.history).toBe("/app/history");
		expect(dashboardNavigationLinks.students).toBe("/app/cwie");
	});
});
