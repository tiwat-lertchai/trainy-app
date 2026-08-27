import { createFileRoute } from "@tanstack/react-router";
import { AppDashboard } from "@/features/dashboard/app-dashboard";

export const Route = createFileRoute("/app")({ component: AppDashboard });
