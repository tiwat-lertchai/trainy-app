import { createFileRoute } from "@tanstack/react-router";
import { InviteRedeemPage } from "@/features/invites/invite-redeem-page";

export const Route = createFileRoute("/app/invites/$token")({
	component: InviteRedeemPage,
});
