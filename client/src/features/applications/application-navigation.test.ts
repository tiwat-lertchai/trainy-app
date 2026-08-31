import { describe, expect, it } from "bun:test";
import { canAccessStudentRequest, studentApplicationPaths } from "./application-navigation";

describe("student application navigation", () => {
	it("provides direct routes for listed and self-arranged internships", () => {
		expect(studentApplicationPaths.browseInternships).toBe("/app/internships");
		expect(studentApplicationPaths.selfArrangedRequest).toBe("/app/internship-request");
	});

	it("shows the self-arranged request form only to students", () => {
		expect(canAccessStudentRequest("student")).toBeTrue();
		expect(canAccessStudentRequest("advisor")).toBeFalse();
		expect(canAccessStudentRequest(undefined)).toBeFalse();
	});
});
