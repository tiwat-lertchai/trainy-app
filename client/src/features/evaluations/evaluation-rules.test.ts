import { describe, expect, test } from "bun:test";
import { canEditEvaluation, evaluatorKeys, visibleEvaluations } from "./evaluation-rules";

const records = [
	{ id: "advisor", evaluatorType: "advisor" as const, status: "draft" as const },
	{ id: "supervisor", evaluatorType: "supervisor" as const, status: "submitted" as const },
];

describe("evaluation presentation rules", () => {
	test("locks submitted evaluations", () => {
		expect(canEditEvaluation("draft", true)).toBe(true);
		expect(canEditEvaluation("submitted", true)).toBe(false);
		expect(canEditEvaluation(undefined, false)).toBe(false);
	});
	test("hides drafts from students and from the other evaluator", () => {
		expect(visibleEvaluations(records, "student").map((item) => item.id)).toEqual(["supervisor"]);
		expect(visibleEvaluations(records, "supervisor").map((item) => item.id)).toEqual([
			"supervisor",
		]);
		expect(visibleEvaluations(records, "advisor").map((item) => item.id)).toEqual([
			"advisor",
			"supervisor",
		]);
	});
	test("maps evaluator roles to typed translation keys", () =>
		expect(evaluatorKeys.advisor).toBe("evaluations.evaluator.advisor"));
});
