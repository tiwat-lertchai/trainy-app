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

const errorMessages: Record<string, string> = {
	INVITE_NOT_FOUND: "ไม่พบคำเชิญนี้",
	INVITE_NOT_REDEEMABLE: "คำเชิญนี้ถูกใช้ ยกเลิก หรือหมดอายุแล้ว",
	INVITE_NOT_REVOCABLE: "ไม่สามารถยกเลิกคำเชิญนี้ได้",
	MEMBERSHIP_CONFLICT: "บัญชีนี้เป็นสมาชิกขององค์กรดังกล่าวอยู่แล้ว",
	COMPANY_NOT_FOUND: "ไม่พบสถานประกอบการที่เลือก",
	UNAUTHORIZED: "กรุณาเข้าสู่ระบบก่อนดำเนินการ",
	FORBIDDEN: "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ",
};

export function inviteErrorMessage(code?: string) {
	return (code && errorMessages[code]) || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
