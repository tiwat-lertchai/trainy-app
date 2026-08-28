import { createFileRoute } from "@tanstack/react-router";
import { ProgressPage } from "@/features/progress/progress-page";
export const Route = createFileRoute("/app/progress")({ component: ProgressPage });
