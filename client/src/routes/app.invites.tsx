import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/invites")({ component: Outlet });
