import { describe, expect, it } from "bun:test";
import {
	buildInviteUrl,
	canManageInvites,
	getInviteStatus,
	inviteErrorMessage,
} from "./invite-rules";

const future = "2026-09-10T00:00:00.000Z";
const now = new Date("2026-09-01T00:00:00.000Z");

describe("invite rules", () => {
	it("derives every lifecycle status and treats the expiry instant as expired", () => {
		expect(getInviteStatus({ expiresAt: future, redeemedAt: null, revokedAt: null }, now)).toBe(
			"pending",
		);
		expect(getInviteStatus({ expiresAt: future, redeemedAt: now, revokedAt: null }, now)).toBe(
			"redeemed",
		);
		expect(getInviteStatus({ expiresAt: future, redeemedAt: null, revokedAt: now }, now)).toBe(
			"revoked",
		);
		expect(getInviteStatus({ expiresAt: now, redeemedAt: null, revokedAt: null }, now)).toBe(
			"expired",
		);
	});
	it("uses terminal timestamps before expiry", () => {
		expect(getInviteStatus({ expiresAt: "2020-01-01", redeemedAt: now, revokedAt: now }, now)).toBe(
			"redeemed",
		);
	});
	it("builds an encoded, origin-relative invite URL", () => {
		expect(buildInviteUrl("https://trainy.test/", "a/b ?")).toBe(
			"https://trainy.test/app/invites/a%2Fb%20%3F",
		);
	});
	it("limits management to university managers", () => {
		expect(canManageInvites("university_admin")).toBe(true);
		expect(canManageInvites("coordinator")).toBe(true);
		expect(canManageInvites("company_admin")).toBe(false);
	});
	it("maps known codes and safely falls back", () => {
		expect(inviteErrorMessage("MEMBERSHIP_CONFLICT")).toContain("สมาชิก");
		expect(inviteErrorMessage("UNKNOWN")).toContain("ลองใหม่");
	});
});
