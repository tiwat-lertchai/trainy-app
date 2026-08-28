export type EvaluationStatus = "draft" | "submitted";
export type EvaluatorType = "advisor" | "supervisor";

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

export function evaluatorLabel(type: EvaluatorType) {
	return type === "advisor" ? "อาจารย์ที่ปรึกษา" : "พี่เลี้ยงสถานประกอบการ";
}
