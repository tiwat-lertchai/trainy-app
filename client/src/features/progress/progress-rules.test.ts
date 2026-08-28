import { expect, test } from "bun:test";
import { canEditReport, canReviewReport } from "./progress-rules";
test("progress actions follow ownership and state", () => {
	expect(canEditReport("revision_requested", true)).toBeTrue();
	expect(canReviewReport("draft", true)).toBeFalse();
});
