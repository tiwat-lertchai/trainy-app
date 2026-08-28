import { describe, expect, test } from "bun:test";
import type {
  AdjustmentRecord,
  AttendancePlacement,
  AttendanceRecord,
  AttendanceRepository,
  WorkSchedule,
} from "./attendance.repository";
import { AttendanceService } from "./attendance.service";

const MONDAY_MORNING = new Date("2026-10-05T02:05:00.000Z"); // 09:05 Asia/Bangkok, Monday (after grace, counts as late)
const MONDAY_ON_TIME = new Date("2026-10-05T01:05:00.000Z"); // 08:05 Asia/Bangkok, Monday (within grace)
const MONDAY_EVENING = new Date("2026-10-05T10:00:00.000Z"); // 17:00 Asia/Bangkok, Monday

describe("AttendanceService", () => {
  describe("saveSchedule", () => {
    test("rejects an actor without company_admin access", () => {
      const repository = seededRepository();
      expect(
        new AttendanceService(repository).saveSchedule("outsider", "placement", scheduleInput()),
      ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
    });

    test("rejects changes to a terminal placement", () => {
      const repository = seededRepository();
      repository.placement.status = "completed";
      expect(
        new AttendanceService(repository).saveSchedule(
          "company-admin",
          "placement",
          scheduleInput(),
        ),
      ).rejects.toMatchObject({ code: "ATTENDANCE_SCHEDULE_IMMUTABLE" });
    });

    test("lets the company admin replace schedules", async () => {
      const repository = seededRepository();
      const days = await new AttendanceService(repository).saveSchedule(
        "company-admin",
        "placement",
        scheduleInput(),
      );
      expect(days).toHaveLength(1);
    });
  });

  describe("checkIn", () => {
    test("rejects an actor who is not the placement student", () => {
      const repository = seededRepository();
      repository.schedules.push(schedule());
      expect(
        new AttendanceService(repository, () => MONDAY_MORNING).checkIn(
          "outsider",
          "placement",
          {},
        ),
      ).rejects.toMatchObject({ code: "ATTENDANCE_NOT_FOUND" });
    });

    test("rejects when the placement is not active", () => {
      const repository = seededRepository();
      repository.placement.status = "pending";
      repository.schedules.push(schedule());
      expect(
        new AttendanceService(repository, () => MONDAY_MORNING).checkIn("student", "placement", {}),
      ).rejects.toMatchObject({ code: "PLACEMENT_NOT_ACTIVE" });
    });

    test("rejects when no schedule exists for the day", () => {
      const repository = seededRepository();
      expect(
        new AttendanceService(repository, () => MONDAY_MORNING).checkIn("student", "placement", {}),
      ).rejects.toMatchObject({ code: "ATTENDANCE_SCHEDULE_NOT_FOUND" });
    });

    test("rejects a duplicate check-in for the same day", () => {
      const repository = seededRepository();
      repository.schedules.push(schedule());
      repository.attendance.set("existing", attendanceRecord({ workDate: "2026-10-05" }));
      expect(
        new AttendanceService(repository, () => MONDAY_MORNING).checkIn("student", "placement", {}),
      ).rejects.toMatchObject({ code: "ATTENDANCE_ALREADY_EXISTS" });
    });

    test("requires a location or exception reason when onsite is required", () => {
      const repository = seededRepository();
      repository.schedules.push(schedule({ locationPolicy: "required_onsite" }));
      expect(
        new AttendanceService(repository, () => MONDAY_MORNING).checkIn("student", "placement", {}),
      ).rejects.toMatchObject({ code: "ATTENDANCE_LOCATION_REQUIRED" });
    });

    test("rejects a location outside the geofence when onsite is required", () => {
      const repository = seededRepository();
      repository.schedules.push(schedule({ locationPolicy: "required_onsite" }));
      expect(
        new AttendanceService(repository, () => MONDAY_MORNING).checkIn("student", "placement", {
          location: { latitude: 0, longitude: 0, accuracyMeters: 5 },
        }),
      ).rejects.toMatchObject({ code: "ATTENDANCE_OUTSIDE_GEOFENCE" });
    });

    test("records attendance with an exception reason when onsite is required", async () => {
      const repository = seededRepository();
      repository.schedules.push(schedule({ locationPolicy: "required_onsite" }));
      const record = await new AttendanceService(repository, () => MONDAY_MORNING).checkIn(
        "student",
        "placement",
        {
          locationExceptionReason: "Company wifi disabled device GPS today.",
        },
      );
      expect(record).toMatchObject({ status: "checked_in" });
    });

    test("records attendance inside the geofence", async () => {
      const repository = seededRepository();
      repository.schedules.push(schedule({ locationPolicy: "required_onsite" }));
      const record = await new AttendanceService(repository, () => MONDAY_MORNING).checkIn(
        "student",
        "placement",
        {
          location: { latitude: 13.75, longitude: 100.5, accuracyMeters: 5 },
        },
      );
      expect(record.checkInLocation?.insideGeofence).toBe(true);
    });
  });

  describe("checkOut", () => {
    test("rejects checking out an already complete attendance", () => {
      const repository = seededRepository();
      repository.attendance.set("attendance", attendanceRecord({ checkedOutAt: MONDAY_EVENING }));
      expect(
        new AttendanceService(repository).checkOut("student", "attendance", {}),
      ).rejects.toMatchObject({ code: "ATTENDANCE_ALREADY_COMPLETE" });
    });

    test("rejects a check-out timestamp before check-in", () => {
      const repository = seededRepository();
      repository.schedules.push(schedule());
      repository.attendance.set(
        "attendance",
        attendanceRecord({ checkedInAt: MONDAY_EVENING, scheduleId: "schedule" }),
      );
      expect(
        new AttendanceService(repository, () => MONDAY_MORNING).checkOut(
          "student",
          "attendance",
          {},
        ),
      ).rejects.toMatchObject({ code: "INVALID_ATTENDANCE_TIME" });
    });

    test("completes attendance and calculates net minutes", async () => {
      const repository = seededRepository();
      repository.schedules.push(schedule());
      repository.attendance.set(
        "attendance",
        attendanceRecord({ checkedInAt: MONDAY_ON_TIME, scheduleId: "schedule" }),
      );
      const record = await new AttendanceService(repository, () => MONDAY_EVENING).checkOut(
        "student",
        "attendance",
        {},
      );
      expect(record.status).toBe("complete");
      expect(record.netMinutes).toBeGreaterThan(0);
    });
  });

  describe("adjustments", () => {
    test("rejects a duplicate pending adjustment", () => {
      const repository = seededRepository();
      repository.attendance.set("attendance", attendanceRecord());
      repository.adjustments.set(
        "existing",
        adjustment({ attendanceId: "attendance", status: "pending" }),
      );
      expect(
        new AttendanceService(repository).requestAdjustment("student", "attendance", {
          reason: "Forgot to check out on time yesterday.",
        }),
      ).rejects.toMatchObject({ code: "ATTENDANCE_ADJUSTMENT_PENDING" });
    });

    test("rejects an adjustment reviewed by a non-reviewer", () => {
      const repository = seededRepository();
      repository.attendance.set("attendance", attendanceRecord());
      repository.adjustments.set("adjustment", adjustment({ attendanceId: "attendance" }));
      expect(
        new AttendanceService(repository).reviewAdjustment("outsider", "adjustment", {
          decision: "approved",
          note: "Looks fine to me.",
        }),
      ).rejects.toMatchObject({ code: "ATTENDANCE_REVIEWER_REQUIRED" });
    });

    test("applies approved time changes to the attendance record", async () => {
      const repository = seededRepository();
      repository.attendance.set("attendance", attendanceRecord());
      repository.adjustments.set(
        "adjustment",
        adjustment({
          attendanceId: "attendance",
          proposedCheckOutAt: MONDAY_EVENING,
        }),
      );
      const record = await new AttendanceService(repository).reviewAdjustment(
        "advisor",
        "adjustment",
        { decision: "approved", note: "Confirmed with the supervisor." },
      );
      expect(record.status).toBe("approved");
    });
  });

  describe("universitySummary", () => {
    test("rejects an actor without university reporting access", () => {
      const repository = seededRepository();
      expect(
        new AttendanceService(repository).universitySummary(
          "outsider",
          "university",
          "2026-10-01",
          "2026-10-31",
        ),
      ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
    });

    test("aggregates attendance records for the university", async () => {
      const repository = seededRepository();
      repository.universityRecords.push(
        attendanceRecord({ status: "complete", netMinutes: 400, checkedOutAt: MONDAY_EVENING }),
        attendanceRecord({ checkedOutAt: null, status: "checked_in" }),
      );
      const summary = await new AttendanceService(repository).universitySummary(
        "coordinator",
        "university",
        "2026-10-01",
        "2026-10-31",
      );
      expect(summary).toMatchObject({
        totalRecords: 2,
        completedRecords: 1,
        incompleteRecords: 1,
        totalNetMinutes: 400,
      });
    });
  });
});

class MemoryAttendanceRepository implements AttendanceRepository {
  placement: AttendancePlacement = {
    id: "placement",
    applicationId: "application",
    internshipId: "internship",
    studentUserId: "student",
    universityOrganizationId: "university",
    companyOrganizationId: "company",
    advisorUserId: "advisor",
    supervisorUserId: "supervisor",
    startDate: new Date("2026-10-01"),
    endDate: new Date("2027-01-31"),
    status: "active",
    createdAt: new Date("2026-08-27"),
    updatedAt: new Date("2026-08-27"),
  };
  memberships = new Map<string, string>([
    ["university:coordinator", "coordinator"],
    ["company:company-admin", "company_admin"],
  ]);
  schedules: WorkSchedule[] = [];
  attendance = new Map<string, AttendanceRecord>();
  adjustments = new Map<string, AdjustmentRecord>();
  universityRecords: AttendanceRecord[] = [];

  async findPlacement(id: string) {
    return id === this.placement.id ? this.placement : undefined;
  }
  async findActiveMembership(organizationId: string, userId: string) {
    const role = this.memberships.get(`${organizationId}:${userId}`);
    return role ? { role } : undefined;
  }
  async findSchedule(placementId: string, weekday: number) {
    return this.schedules.find(
      (item) => item.placementId === placementId && item.weekday === weekday,
    );
  }
  async replaceSchedules(
    placementId: string,
    schedules: Array<Omit<WorkSchedule, "id" | "placementId" | "createdAt" | "updatedAt">>,
  ) {
    this.schedules = schedules.map(
      (day, index) =>
        ({
          ...day,
          id: `schedule-${index}`,
          placementId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }) as WorkSchedule,
    );
    return this.schedules;
  }
  async listSchedules(placementId: string) {
    return this.schedules.filter((item) => item.placementId === placementId);
  }
  async findAttendance(id: string) {
    return this.attendance.get(id);
  }
  async findAttendanceForDate(placementId: string, workDate: string) {
    return [...this.attendance.values()].find(
      (item) => item.placementId === placementId && item.workDate === workDate,
    );
  }
  async createAttendance(input: AttendanceRecord) {
    if (
      [...this.attendance.values()].some(
        (item) => item.placementId === input.placementId && item.workDate === input.workDate,
      )
    )
      return undefined;
    const record = attendanceRecord(input);
    this.attendance.set(record.id, record);
    return record;
  }
  async completeAttendance(id: string, changes: Partial<AttendanceRecord>) {
    const record = this.attendance.get(id);
    if (!record || record.checkedOutAt) return undefined;
    Object.assign(record, changes);
    return record;
  }
  async listAttendance(placementId: string) {
    return [...this.attendance.values()].filter((item) => item.placementId === placementId);
  }
  async createAdjustment(input: AdjustmentRecord) {
    const pending = [...this.adjustments.values()].some(
      (item) => item.attendanceId === input.attendanceId && item.status === "pending",
    );
    if (pending) return undefined;
    const record = adjustment(input);
    this.adjustments.set(record.id, record);
    return record;
  }
  async findAdjustment(id: string) {
    return this.adjustments.get(id);
  }
  async listPendingAdjustments(placementId: string) {
    const attendanceIds = [...this.attendance.values()]
      .filter((item) => item.placementId === placementId)
      .map((item) => item.id);
    return [...this.adjustments.values()].filter(
      (item) => attendanceIds.includes(item.attendanceId) && item.status === "pending",
    );
  }
  async reviewAdjustment(input: {
    adjustment: AdjustmentRecord;
    reviewerUserId: string;
    decision: "approved" | "rejected";
    note: string;
    attendanceChanges?: Partial<AttendanceRecord>;
    reviewedAt: Date;
  }) {
    if (input.attendanceChanges) {
      const attendance = this.attendance.get(input.adjustment.attendanceId);
      if (attendance) Object.assign(attendance, input.attendanceChanges);
    }
    const record = this.adjustments.get(input.adjustment.id);
    if (!record) throw new Error("Missing adjustment");
    Object.assign(record, {
      status: input.decision,
      reviewerUserId: input.reviewerUserId,
      reviewNote: input.note,
      reviewedAt: input.reviewedAt,
    });
    return record;
  }
  async listUniversityAttendance() {
    return this.universityRecords;
  }
}

function seededRepository() {
  return new MemoryAttendanceRepository();
}

function scheduleInput() {
  return {
    days: [{ weekday: 1, startMinute: 480, endMinute: 1020, breakMinutes: 60, graceMinutes: 10 }],
    timezone: "Asia/Bangkok" as const,
    locationPolicy: "disabled" as const,
  };
}

function schedule(overrides: Partial<WorkSchedule> = {}): WorkSchedule {
  return {
    id: "schedule",
    placementId: "placement",
    weekday: 1,
    startMinute: 480,
    endMinute: 1020,
    breakMinutes: 60,
    graceMinutes: 10,
    timezone: "Asia/Bangkok",
    locationPolicy: "optional",
    geofenceLatitude: 13.75,
    geofenceLongitude: 100.5,
    geofenceRadiusMeters: 200,
    active: true,
    createdAt: new Date("2026-08-27"),
    updatedAt: new Date("2026-08-27"),
    ...overrides,
  };
}

function attendanceRecord(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  const now = new Date("2026-08-27");
  return {
    id: "attendance",
    placementId: "placement",
    studentUserId: "student",
    workDate: "2026-10-05",
    scheduleId: "schedule",
    checkedInAt: MONDAY_MORNING,
    checkedOutAt: null,
    checkInLocation: null,
    checkOutLocation: null,
    locationExceptionReason: null,
    netMinutes: null,
    status: "checked_in",
    studentNote: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function adjustment(overrides: Partial<AdjustmentRecord> = {}): AdjustmentRecord {
  return {
    id: "adjustment",
    attendanceId: "attendance",
    requestedByUserId: "student",
    proposedCheckInAt: null,
    proposedCheckOutAt: null,
    reason: "Forgot to check out on time yesterday.",
    status: "pending",
    reviewerUserId: null,
    reviewNote: null,
    reviewedAt: null,
    createdAt: new Date("2026-08-27"),
    ...overrides,
  };
}
