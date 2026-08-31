import { createFileRoute } from "@tanstack/react-router";
import { StudentInternshipRequestPage } from "@/features/applications/student-internship-request-page";

export const Route = createFileRoute("/app/internship-request")({
	component: StudentInternshipRequestPage,
});
