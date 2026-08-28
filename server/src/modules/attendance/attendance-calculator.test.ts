import { describe, expect, test } from "bun:test";
import { calculateAttendance, distanceMeters } from "./attendance-calculator";

describe("attendance calculations", () => {
  test("subtracts breaks and applies the lateness grace period", () => expect(calculateAttendance({ checkedInAt: new Date("2026-08-28T02:11:00Z"), checkedOutAt: new Date("2026-08-28T10:00:00Z"), scheduledStart: new Date("2026-08-28T02:00:00Z"), scheduledEnd: new Date("2026-08-28T10:00:00Z"), breakMinutes: 60, graceMinutes: 10 })).toEqual({ netMinutes: 409, status: "late" }));
  test("computes a short geofence distance", () => expect(distanceMeters({ latitude: 13.7563, longitude: 100.5018 }, { latitude: 13.7564, longitude: 100.5018 })).toBeLessThan(20));
});
