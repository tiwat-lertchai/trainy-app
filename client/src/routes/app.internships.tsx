import { createFileRoute } from "@tanstack/react-router";
import { InternshipPage } from "@/features/internships/internship-page";

export const Route = createFileRoute("/app/internships")({ component: InternshipPage });
