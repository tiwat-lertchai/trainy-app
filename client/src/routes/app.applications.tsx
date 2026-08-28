import { createFileRoute } from "@tanstack/react-router";
import { ApplicationPage } from "@/features/applications/application-page";

export const Route = createFileRoute("/app/applications")({ component: ApplicationPage });
