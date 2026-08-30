import { describe, expect, test } from "bun:test";
import {
	canReviewDocument,
	documentStatusKeys,
	documentTypeKeys,
	validateDocumentFile,
} from "./document-rules";

describe("document rules", () => {
	test("only an assigned reviewer can review a submitted document", () => {
		expect(canReviewDocument("submitted", true)).toBe(true);
		expect(canReviewDocument("submitted", false)).toBe(false);
		expect(canReviewDocument("approved", true)).toBe(false);
		expect(canReviewDocument("rejected", true)).toBe(false);
	});
	test("maps document types and statuses to typed translation keys", () => {
		expect(documentTypeKeys.consent).toBe("documents.type.consent");
		expect(documentStatusKeys.approved).toBe("documents.status.approved");
	});
	test("accepts only non-empty PDF, JPEG, or PNG files up to 20 MiB", () => {
		expect(validateDocumentFile({ type: "application/pdf", size: 1024 })).toBeNull();
		expect(validateDocumentFile({ type: "text/plain", size: 1024 })).toBe(
			"documents.validation.type",
		);
		expect(validateDocumentFile({ type: "image/png", size: 21 * 1024 * 1024 })).toBe(
			"documents.validation.tooLarge",
		);
		expect(validateDocumentFile({ type: "image/jpeg", size: 0 })).toBe(
			"documents.validation.empty",
		);
	});
});
