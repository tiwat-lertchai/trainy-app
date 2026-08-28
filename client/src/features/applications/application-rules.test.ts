import { describe, expect, it } from "bun:test";
import { availableReviewActions, canWithdrawApplication } from "./application-rules";

describe("application presentation rules", () => {
	it("lets students withdraw only non-terminal applications", () => {
		expect(canWithdrawApplication("submitted")).toBeTrue();
		expect(canWithdrawApplication("accepted")).toBeFalse();
	});

	it("reserves terminal review decisions for company admins", () => {
		expect(availableReviewActions("submitted", false)).toEqual(["under_review"]);
		expect(availableReviewActions("under_review", true)).toEqual(["accepted", "rejected"]);
	});
});
