import { describe, expect, test } from "bun:test";
import { dashboardNavigationLinks } from "./dashboard-navigation";

describe("dashboard navigation", () => {
	test("links the overview item to the dashboard route", () => {
		expect(dashboardNavigationLinks.overview).toBe("/app");
	});
});
