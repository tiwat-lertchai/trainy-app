import type { OrganizationRole } from "@/features/organizations/role-navigation";

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

const errorMessages = {
	th: {
		INVITE_NOT_FOUND: "ไม่พบคำเชิญนี้",
		INVITE_NOT_REDEEMABLE: "คำเชิญนี้ถูกใช้ ยกเลิก หรือหมดอายุแล้ว",
		INVITE_NOT_REVOCABLE: "ไม่สามารถยกเลิกคำเชิญนี้ได้",
		MEMBERSHIP_CONFLICT: "บัญชีนี้เป็นสมาชิกขององค์กรดังกล่าวอยู่แล้ว",
		COMPANY_NOT_FOUND: "ไม่พบสถานประกอบการที่เลือก",
		UNAUTHORIZED: "กรุณาเข้าสู่ระบบก่อนดำเนินการ",
		FORBIDDEN: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ",
		UNKNOWN: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
	},
	en: {
		INVITE_NOT_FOUND: "This invitation was not found.",
		INVITE_NOT_REDEEMABLE: "This invitation has been used, revoked, or expired.",
		INVITE_NOT_REVOCABLE: "This invitation cannot be revoked.",
		MEMBERSHIP_CONFLICT: "This account is already a member of the organization.",
		COMPANY_NOT_FOUND: "The selected company was not found.",
		UNAUTHORIZED: "Sign in before continuing.",
		FORBIDDEN: "This account does not have permission to continue.",
		UNKNOWN: "Something went wrong. Please try again.",
	},
};

export function inviteErrorMessage(code?: string, locale: "th" | "en" = "th") {
	return (
		(code && errorMessages[locale][code as keyof (typeof errorMessages)["th"]]) ||
		errorMessages[locale].UNKNOWN
	);
}
