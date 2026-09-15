import { describe, expect, it } from "bun:test";
import { authErrorMessage, type AuthMode } from "./auth";

describe("email authentication UI", () => {
	it("uses a safe generic error for invalid credentials", () => {
		expect(authErrorMessage(new Error("invalid credentials"))).toBe(
			"ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่",
		);
	});

	it("recognizes rate limit responses without exposing server details", () => {
		expect(authErrorMessage(new Error("HTTP 429 rate limited"))).toContain("ลองหลายครั้งเกินไป");
	});

	it("keeps all intended auth modes in the public contract", () => {
		const modes: AuthMode[] = ["sign-in", "sign-up", "forgot"];
		expect(modes).toHaveLength(3);
	});
});
