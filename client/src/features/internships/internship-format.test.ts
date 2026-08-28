import { describe, expect, it } from "bun:test";
import { canApply, formatWorkMode } from "./internship-format";

describe("internship presentation rules", () => {
	it("localizes work modes", () => {
		expect(formatWorkMode("hybrid", "th")).toBe("ไฮบริด");
		expect(formatWorkMode("remote", "en")).toBe("Remote");
	});

	it("allows applications only before the deadline", () => {
		const now = new Date("2027-01-10T00:00:00.000Z");
		expect(canApply("2027-01-11T00:00:00.000Z", now)).toBeTrue();
		expect(canApply("2027-01-09T00:00:00.000Z", now)).toBeFalse();
	});
});
