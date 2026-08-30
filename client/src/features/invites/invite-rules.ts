import type { OrganizationRole } from "@/features/organizations/role-navigation";
import type { MessageKey } from "@/i18n/messages";

export type InviteStatus = "pending" | "redeemed" | "revoked" | "expired";
export type InviteState = {
	expiresAt: string | Date;
	redeemedAt: string | Date | null;
	revokedAt: string | Date | null;
};

export function getInviteStatus(invite: InviteState, now = new Date()): InviteStatus {
	if (invite.redeemedAt) return "redeemed";
	if (invite.revokedAt) return "revoked";
	if (new Date(invite.expiresAt).getTime() <= now.getTime()) return "expired";
	return "pending";
}

export function buildInviteUrl(origin: string, token: string) {
	return `${origin.replace(/\/$/, "")}/app/invites/${encodeURIComponent(token)}`;
}

export function canManageInvites(role: OrganizationRole | undefined) {
	return role === "university_admin" || role === "coordinator";
}

const errorKeys: Record<string, MessageKey> = {
	INVITE_NOT_FOUND: "invites.error.notFound",
	INVITE_NOT_REDEEMABLE: "invites.error.notRedeemable",
	INVITE_NOT_REVOCABLE: "invites.error.notRevocable",
	MEMBERSHIP_CONFLICT: "invites.error.membershipConflict",
	COMPANY_NOT_FOUND: "invites.error.companyNotFound",
	UNAUTHORIZED: "invites.error.unauthorized",
	FORBIDDEN: "invites.error.forbidden",
	UNKNOWN: "invites.error.unknown",
};
export function inviteErrorKey(code?: string): MessageKey {
	return (code && errorKeys[code]) || "invites.error.unknown";
}
