import { describe, expect, test } from "bun:test";
import { canCancelRequest, canResubmitRequest } from "./internship-request-rules";

describe("internship request presentation rules", () => {
	test("allows cancellation only while a request remains open", () => {
		expect(canCancelRequest("submitted")).toBe(true);
		expect(canCancelRequest("revision_requested")).toBe(true);
		expect(canCancelRequest("approved")).toBe(false);
		expect(canCancelRequest("rejected")).toBe(false);
	});

	test("allows resubmission only after a revision request", () => {
		expect(canResubmitRequest("revision_requested")).toBe(true);
		expect(canResubmitRequest("submitted")).toBe(false);
	});
});
