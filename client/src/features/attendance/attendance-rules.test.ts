import { expect, test } from "bun:test";
import {
	adjustmentStatusKeys,
	attendanceStatusKeys,
	canCheckInOut,
	canManageSchedule,
	canReviewAdjustments,
	canViewUniversitySummary,
	formatNetMinutes,
} from "./attendance-rules";

test("only the company admin manages the work schedule", () => {
	expect(canManageSchedule("company_admin")).toBeTrue();
	expect(canManageSchedule("supervisor")).toBeFalse();
	expect(canManageSchedule(undefined)).toBeFalse();
});

test("only the student checks in or out", () => {
	expect(canCheckInOut("student")).toBeTrue();
	expect(canCheckInOut("advisor")).toBeFalse();
});

test("only the assigned advisor or supervisor reviews adjustments", () => {
	expect(canReviewAdjustments("advisor")).toBeTrue();
	expect(canReviewAdjustments("supervisor")).toBeTrue();
	expect(canReviewAdjustments("student")).toBeFalse();
});

test("only university staff view the university summary", () => {
	expect(canViewUniversitySummary("coordinator")).toBeTrue();
	expect(canViewUniversitySummary("company_admin")).toBeFalse();
});

test("formats net minutes into hours and minutes", () => {
	expect(formatNetMinutes(125, "hr", "min")).toBe("2 hr 5 min");
	expect(formatNetMinutes(null)).toBe("-");
});

test("labels known attendance and adjustment statuses", () => {
	expect(attendanceStatusKeys.late_and_left_early).toBe("attendance.status.lateAndLeftEarly");
	expect(adjustmentStatusKeys.approved).toBe("attendance.adjustment.approved");
});
