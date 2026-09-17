import { describe, expect, it } from "bun:test";
import { canReviewAccessRequests, getNavigationForRole } from "./role-navigation";

describe("role navigation", () => {
	it("gives students access to their workflow but not tenant administration", () => {
		const navigation = getNavigationForRole("student");
		expect(navigation).toContain("internships");
		expect(navigation).toContain("progress");
		expect(navigation).toContain("cwie");
		expect(navigation).not.toContain("members");
		expect(navigation).not.toContain("reports");
	});

	it("gives organization admins the relevant management surfaces", () => {
		expect(getNavigationForRole("university_admin")).toContain("members");
		expect(getNavigationForRole("university_admin")).toContain("accessReviews");
		expect(getNavigationForRole("company_admin")).toContain("internships");
	});

	it("exposes access reviews only to roles that can decide onboarding requests", () => {
		expect(canReviewAccessRequests("university_admin")).toBeTrue();
		expect(canReviewAccessRequests("coordinator")).toBeTrue();
		expect(canReviewAccessRequests("company_admin")).toBeTrue();
		expect(canReviewAccessRequests("advisor")).toBeFalse();
		expect(canReviewAccessRequests("student")).toBeFalse();
	});

	it("does not expose tenant administration to advisors or supervisors", () => {
		expect(getNavigationForRole("advisor")).not.toContain("members");
		expect(getNavigationForRole("supervisor")).not.toContain("reports");
		expect(getNavigationForRole("supervisor")).not.toContain("accessReviews");
		expect(getNavigationForRole("supervisor")).toContain("cwie");
	});
});
