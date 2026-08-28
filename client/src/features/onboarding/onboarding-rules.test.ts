import { describe, expect, it } from "bun:test";
import { facultiesEnabledForRole, isImmediatelyApproved, organizationFieldLabel, organizationTypeForRole } from "./onboarding-rules";

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

	it("labels the organization field so it is not mistaken for a generic org", () => {
		expect(organizationFieldLabel("university")).toBe("องค์กร/มหาวิทยาลัย");
		expect(organizationFieldLabel("company")).toBe("องค์กร/บริษัท");
	});

	it("shows faculty selection only for student and advisor requests", () => {
		expect(facultiesEnabledForRole("student")).toBeTrue();
		expect(facultiesEnabledForRole("advisor")).toBeTrue();
		expect(facultiesEnabledForRole("supervisor")).toBeFalse();
	});
});
