import { describe, expect, it } from "bun:test";
import {
	canAccessStudentRequest,
	studentApplicationActionPlacement,
	studentApplicationPaths,
} from "./application-navigation";

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

	it("puts both application actions inside the empty state when the student has no applications", () => {
		expect(studentApplicationActionPlacement("student", 0)).toBe("empty-state");
		expect(studentApplicationActionPlacement("student", 2)).toBe("header");
		expect(studentApplicationActionPlacement("advisor", 0)).toBe("hidden");
		expect(studentApplicationActionPlacement("student", undefined)).toBe("hidden");
	});
});
