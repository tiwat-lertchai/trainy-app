import { describe, expect, test } from "bun:test";
import { canEditCwie, canManageCwieVisits, canReviewCwie } from "./cwie-rules";

describe("CWIE client rules", () => {
	test("lets students edit only draft or returned records", () => {
		expect(canEditCwie("draft", "student")).toBe(true);
		expect(canEditCwie("revision_requested", "student")).toBe(true);
		expect(canEditCwie("submitted", "student")).toBe(false);
		expect(canEditCwie("draft", "advisor")).toBe(false);
	});

	test("offers review actions only to assigned-role experiences for submitted records", () => {
		expect(canReviewCwie("submitted", "advisor")).toBe(true);
		expect(canReviewCwie("submitted", "supervisor")).toBe(true);
		expect(canReviewCwie("approved", "advisor")).toBe(false);
		expect(canReviewCwie("submitted", "student")).toBe(false);
	});

	test("reserves supervision scheduling for advisors", () => {
		expect(canManageCwieVisits("advisor")).toBe(true);
		expect(canManageCwieVisits("supervisor")).toBe(false);
	});
});
