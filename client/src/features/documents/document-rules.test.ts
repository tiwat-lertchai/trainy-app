import { describe, expect, test } from "bun:test";
import { canReviewDocument, documentStatusLabel, documentTypeLabel } from "./document-rules";

describe("document rules", () => {
	test("only an assigned reviewer can review a submitted document", () => {
		expect(canReviewDocument("submitted", true)).toBe(true);
		expect(canReviewDocument("submitted", false)).toBe(false);
		expect(canReviewDocument("approved", true)).toBe(false);
		expect(canReviewDocument("rejected", true)).toBe(false);
	});
	test("presents document types and statuses in Thai", () => {
		expect(documentTypeLabel("consent")).toBe("หนังสือยินยอม");
		expect(documentStatusLabel("approved")).toBe("อนุมัติแล้ว");
	});
});
