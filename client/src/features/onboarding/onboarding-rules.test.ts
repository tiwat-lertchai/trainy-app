import { describe, expect, it } from "bun:test";
import { isImmediatelyApproved, organizationTypeForRole } from "./onboarding-rules";

describe("onboarding presentation rules", () => {
	it("auto-approves only students", () => {
		expect(isImmediatelyApproved("student")).toBeTrue();
		expect(isImmediatelyApproved("advisor")).toBeFalse();
		expect(isImmediatelyApproved("company_admin")).toBeFalse();
	});

	it("filters tenant choices by requested role", () => {
		expect(organizationTypeForRole("advisor")).toBe("university");
		expect(organizationTypeForRole("supervisor")).toBe("company");
		expect(organizationTypeForRole("company_admin")).toBeNull();
	});
});
