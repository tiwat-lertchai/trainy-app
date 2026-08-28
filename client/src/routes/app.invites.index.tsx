import { createFileRoute } from "@tanstack/react-router";
import { InviteManagementPage } from "@/features/invites/invite-management-page";

export const Route = createFileRoute("/app/invites/")({ component: InviteManagementPage });
