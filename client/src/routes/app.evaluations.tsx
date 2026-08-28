import { createFileRoute } from "@tanstack/react-router";
import { EvaluationPage } from "@/features/evaluations/evaluation-page";
export const Route = createFileRoute("/app/evaluations")({ component: EvaluationPage });
