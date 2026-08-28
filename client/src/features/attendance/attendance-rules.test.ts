import { expect, test } from "bun:test";
import {
	adjustmentStatusLabel,
	attendanceStatusLabel,
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
	expect(formatNetMinutes(125)).toBe("2 ชม. 5 นาที");
	expect(formatNetMinutes(null)).toBe("-");
});

test("labels known attendance and adjustment statuses", () => {
	expect(attendanceStatusLabel("late_and_left_early")).toBe("มาสายและออกก่อนเวลา");
	expect(attendanceStatusLabel("unknown_status")).toBe("unknown_status");
	expect(adjustmentStatusLabel("approved")).toBe("อนุมัติแล้ว");
});
