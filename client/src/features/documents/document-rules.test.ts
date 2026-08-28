import { describe, expect, test } from "bun:test";
import {
	canReviewDocument,
	documentStatusLabel,
	documentTypeLabel,
	validateDocumentFile,
} from "./document-rules";

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
	test("accepts only non-empty PDF, JPEG, or PNG files up to 20 MiB", () => {
		expect(validateDocumentFile({ type: "application/pdf", size: 1024 })).toBeNull();
		expect(validateDocumentFile({ type: "text/plain", size: 1024 })).toContain("PDF");
		expect(validateDocumentFile({ type: "image/png", size: 21 * 1024 * 1024 })).toContain("20 MB");
		expect(validateDocumentFile({ type: "image/jpeg", size: 0 })).toContain("ว่างเปล่า");
	});
});
