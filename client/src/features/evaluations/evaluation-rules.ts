export type EvaluationStatus = "draft" | "submitted";
export type EvaluatorType = "advisor" | "supervisor" | "center_head" | "program_committee";

export function canEditEvaluation(status: EvaluationStatus | undefined, evaluator: boolean) {
	return evaluator && status !== "submitted";
}

export function visibleEvaluations<
	T extends { status: EvaluationStatus; evaluatorType: EvaluatorType },
>(records: T[], role: string | undefined) {
	if (role === "student") return records.filter((record) => record.status === "submitted");
	if (role === "advisor" || role === "supervisor")
		return records.filter(
			(record) => record.status === "submitted" || record.evaluatorType === role,
		);
	return [];
}

export const evaluatorKeys = {
	advisor: "evaluations.evaluator.advisor",
	supervisor: "evaluations.evaluator.supervisor",
	center_head: "evaluations.evaluator.advisor",
	program_committee: "evaluations.evaluator.advisor",
} satisfies Record<EvaluatorType, MessageKey>;
import type { MessageKey } from "@/i18n/messages";
