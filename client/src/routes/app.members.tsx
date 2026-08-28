import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "@/features/organizations/members-page";
export const Route = createFileRoute("/app/members")({ component: MembersPage });
