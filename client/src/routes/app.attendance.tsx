import { createFileRoute } from "@tanstack/react-router";
import { AttendancePage } from "@/features/attendance/attendance-page";
export const Route = createFileRoute("/app/attendance")({ component: AttendancePage });
