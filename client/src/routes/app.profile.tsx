import { createFileRoute } from "@tanstack/react-router";
import { StudentProfilePage } from "@/features/student-profile/student-profile-page";

export const Route = createFileRoute("/app/profile")({ component: StudentProfilePage });
