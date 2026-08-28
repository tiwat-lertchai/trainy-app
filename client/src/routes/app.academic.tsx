import { createFileRoute } from "@tanstack/react-router";
import { AcademicAdminPage } from "@/features/academic/academic-admin-page";
export const Route = createFileRoute("/app/academic")({ component: AcademicAdminPage });
