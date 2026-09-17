import { createFileRoute } from "@tanstack/react-router";
import { CwiePage } from "@/features/cwie/cwie-page";

export const Route = createFileRoute("/app/cwie")({ component: CwiePage });
