import { describe, expect, it } from "bun:test";
import { getNavigationForRole } from "./role-navigation";

describe("role navigation", () => {
	it("gives students access to their workflow but not tenant administration", () => {
		const navigation = getNavigationForRole("student");
		expect(navigation).toContain("internships");
		expect(navigation).toContain("progress");
		expect(navigation).not.toContain("members");
		expect(navigation).not.toContain("reports");
	});

	it("gives organization admins the relevant management surfaces", () => {
		expect(getNavigationForRole("university_admin")).toContain("members");
		expect(getNavigationForRole("company_admin")).toContain("internships");
	});

	it("does not expose tenant administration to advisors or supervisors", () => {
		expect(getNavigationForRole("advisor")).not.toContain("members");
		expect(getNavigationForRole("supervisor")).not.toContain("reports");
	});
});
