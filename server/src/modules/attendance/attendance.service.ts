import { AppError } from "../../lib/app-error";
import { calculateAttendance, distanceMeters } from "./attendance-calculator";
import type {
  AttendancePlacement,
  AttendanceRecord,
  AttendanceRepository,
  WorkSchedule,
} from "./attendance.repository";

type LocationInput = { latitude: number; longitude: number; accuracyMeters: number };
type ActionInput = { location?: LocationInput; locationExceptionReason?: string; note?: string };
type CheckInInput = ActionInput & { offsiteDestination?: string };

export class AttendanceService {
  constructor(
    private readonly repository: AttendanceRepository,
    private readonly now = () => new Date(),
  ) {}

  async saveSchedule(
    actorUserId: string,
    placementId: string,
    input: {
      days: Array<{
        weekday: number;
        startMinute: number;
        endMinute: number;
        breakMinutes: number;
        graceMinutes: number;
      }>;
      timezone: "Asia/Bangkok";
      locationPolicy: "disabled" | "optional" | "required_onsite";
      geofence?: { latitude: number; longitude: number; radiusMeters: number };
    },
  ) {
    const placement = await this.requirePlacement(placementId);
    await this.requireRole(placement.companyOrganizationId, actorUserId, ["company_admin"]);
    if (["completed", "cancelled"].includes(placement.status))
      throw new AppError(
        "A terminal placement schedule cannot be changed",
        409,
        "ATTENDANCE_SCHEDULE_IMMUTABLE",
      );
    return this.repository.replaceSchedules(
      placementId,
      input.days.map((day) => ({
        ...day,
        timezone: input.timezone,
        locationPolicy: input.locationPolicy,
        geofenceLatitude: input.geofence?.latitude ?? null,
        geofenceLongitude: input.geofence?.longitude ?? null,
        geofenceRadiusMeters: input.geofence?.radiusMeters ?? null,
      })),
    );
  }

  async listSchedules(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    await this.requireParticipantOrStaff(actorUserId, placement);
    return this.repository.listSchedules(placementId);
  }

  async checkIn(actorUserId: string, placementId: string, input: CheckInInput) {
    const placement = await this.requirePlacement(placementId);
    this.requireStudent(actorUserId, placement.studentUserId);
    if (input.offsiteDestination && !input.locationExceptionReason?.trim())
      throw new AppError(
        "An off-site reason is required with the destination",
        422,
        "ATTENDANCE_OFFSITE_REASON_REQUIRED",
      );
    if (placement.status !== "active")
      throw new AppError("Attendance requires an active placement", 409, "PLACEMENT_NOT_ACTIVE");
    const now = this.now();
    const local = bangkokParts(now);
    const schedule = await this.repository.findSchedule(placementId, local.weekday);
    if (!schedule)
      throw new AppError(
        "No active work schedule exists for today",
        409,
        "ATTENDANCE_SCHEDULE_NOT_FOUND",
      );
    const leave = await this.repository.findLeaveForDate(placementId, local.date);
    if (leave && leave.status !== "rejected")
      throw new AppError(
        "Attendance cannot be recorded while leave is pending or approved",
        409,
        "ATTENDANCE_LEAVE_CONFLICT",
      );
    const evidence = this.validateLocation(schedule, input, now);
    const record = await this.repository.createAttendance({
      placementId,
      studentUserId: actorUserId,
      workDate: local.date,
      scheduleId: schedule.id,
      checkedInAt: now,
      checkInLocation: evidence,
      locationExceptionReason: input.locationExceptionReason,
      offsiteDestination: input.offsiteDestination,
      studentNote: input.note,
    });
    if (!record)
      throw new AppError(
        "Attendance has already been recorded today",
        409,
        "ATTENDANCE_ALREADY_EXISTS",
      );
    return record;
  }

  async checkOut(actorUserId: string, attendanceId: string, input: ActionInput) {
    const attendance = await this.requireAttendance(attendanceId);
    this.requireStudent(actorUserId, attendance.studentUserId);
    if (attendance.checkedOutAt)
      throw new AppError("Attendance is already complete", 409, "ATTENDANCE_ALREADY_COMPLETE");
    const placement = await this.requirePlacement(attendance.placementId);
    if (placement.status !== "active")
      throw new AppError("Attendance requires an active placement", 409, "PLACEMENT_NOT_ACTIVE");
    const schedule = attendance.scheduleId
      ? (await this.repository.listSchedules(attendance.placementId)).find(
          (item) => item.id === attendance.scheduleId,
        )
      : undefined;
    if (!schedule)
      throw new AppError("Attendance schedule was not found", 409, "ATTENDANCE_SCHEDULE_NOT_FOUND");
    const now = this.now();
    if (now <= attendance.checkedInAt)
      throw new AppError("Check-out must be after check-in", 422, "INVALID_ATTENDANCE_TIME");
    const evidence = this.validateLocation(schedule, input, now);
    const scheduled = scheduleBounds(attendance.workDate, schedule);
    const result = calculateAttendance({
      checkedInAt: attendance.checkedInAt,
      checkedOutAt: now,
      scheduledStart: scheduled.start,
      scheduledEnd: scheduled.end,
      breakMinutes: schedule.breakMinutes,
      graceMinutes: schedule.graceMinutes,
    });
    const record = await this.repository.completeAttendance(attendance.id, {
      checkedOutAt: now,
      checkOutLocation: evidence,
      locationExceptionReason: input.locationExceptionReason ?? attendance.locationExceptionReason,
      studentNote: input.note ?? attendance.studentNote,
      ...result,
    });
    if (!record)
      throw new AppError("Attendance is already complete", 409, "ATTENDANCE_ALREADY_COMPLETE");
    return record;
  }

  async list(actorUserId: string, placementId: string, from?: string, to?: string) {
    const placement = await this.requirePlacement(placementId);
    await this.requireParticipantOrStaff(actorUserId, placement);
    return this.repository.listAttendance(placementId, from, to);
  }

  async requestAdjustment(
    actorUserId: string,
    attendanceId: string,
    input: { proposedCheckInAt?: Date; proposedCheckOutAt?: Date; reason: string },
  ) {
    const attendance = await this.requireAttendance(attendanceId);
    this.requireStudent(actorUserId, attendance.studentUserId);
    const checkIn = input.proposedCheckInAt ?? attendance.checkedInAt;
    const checkOut = input.proposedCheckOutAt ?? attendance.checkedOutAt;
    if (checkOut && checkOut <= checkIn)
      throw new AppError("Check-out must be after check-in", 422, "INVALID_ATTENDANCE_TIME");
    const record = await this.repository.createAdjustment({
      attendanceId,
      requestedByUserId: actorUserId,
      ...input,
    });
    if (!record)
      throw new AppError(
        "A pending adjustment already exists",
        409,
        "ATTENDANCE_ADJUSTMENT_PENDING",
      );
    return record;
  }

  async listAdjustments(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    this.requireReviewer(actorUserId, placement);
    return this.repository.listPendingAdjustments(placementId);
  }

  async reviewAdjustment(
    actorUserId: string,
    adjustmentId: string,
    input: { decision: "approved" | "rejected"; note: string },
  ) {
    const adjustment = await this.repository.findAdjustment(adjustmentId);
    if (!adjustment)
      throw new AppError(
        "Attendance adjustment was not found",
        404,
        "ATTENDANCE_ADJUSTMENT_NOT_FOUND",
      );
    if (adjustment.status !== "pending")
      throw new AppError(
        "Attendance adjustment was already reviewed",
        409,
        "ATTENDANCE_ADJUSTMENT_REVIEWED",
      );
    const attendance = await this.requireAttendance(adjustment.attendanceId);
    const placement = await this.requirePlacement(attendance.placementId);
    this.requireReviewer(actorUserId, placement);
    let changes: Partial<AttendanceRecord> | undefined;
    if (input.decision === "approved") {
      const checkedInAt = adjustment.proposedCheckInAt ?? attendance.checkedInAt;
      const checkedOutAt = adjustment.proposedCheckOutAt ?? attendance.checkedOutAt;
      if (checkedOutAt && checkedOutAt <= checkedInAt)
        throw new AppError("Check-out must be after check-in", 422, "INVALID_ATTENDANCE_TIME");
      changes = { checkedInAt, checkedOutAt };
      if (checkedOutAt && attendance.scheduleId) {
        const schedule = (await this.repository.listSchedules(attendance.placementId)).find(
          (item) => item.id === attendance.scheduleId,
        );
        if (schedule)
          Object.assign(
            changes,
            calculateAttendance({
              checkedInAt,
              checkedOutAt,
              ...scheduleBounds(attendance.workDate, schedule),
              scheduledStart: scheduleBounds(attendance.workDate, schedule).start,
              scheduledEnd: scheduleBounds(attendance.workDate, schedule).end,
              breakMinutes: schedule.breakMinutes,
              graceMinutes: schedule.graceMinutes,
            }),
          );
      }
    }
    return this.repository.reviewAdjustment({
      adjustment,
      reviewerUserId: actorUserId,
      decision: input.decision,
      note: input.note,
      attendanceChanges: changes,
      reviewedAt: this.now(),
    });
  }

  async requestLeave(
    actorUserId: string,
    placementId: string,
    input: { leaveDate: string; reason: string },
  ) {
    const placement = await this.requirePlacement(placementId);
    this.requireStudent(actorUserId, placement.studentUserId);
    if (placement.status !== "active")
      throw new AppError("Leave requires an active placement", 409, "PLACEMENT_NOT_ACTIVE");
    const placementStart = bangkokParts(placement.startDate).date;
    const placementEnd = bangkokParts(placement.endDate).date;
    if (input.leaveDate < placementStart || input.leaveDate > placementEnd)
      throw new AppError(
        "Leave date must fall within the placement period",
        422,
        "LEAVE_DATE_OUTSIDE_PLACEMENT",
      );
    if (await this.repository.findAttendanceForDate(placementId, input.leaveDate))
      throw new AppError(
        "Leave cannot be requested for a date with attendance",
        409,
        "LEAVE_ATTENDANCE_CONFLICT",
      );
    const record = await this.repository.createLeave({
      placementId,
      requestedByUserId: actorUserId,
      leaveDate: input.leaveDate,
      reason: input.reason,
    });
    if (!record)
      throw new AppError(
        "A leave request already exists for this date",
        409,
        "LEAVE_REQUEST_CONFLICT",
      );
    return record;
  }

  async listLeaves(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    await this.requireParticipantOrStaff(actorUserId, placement);
    return this.repository.listLeaves(placementId);
  }

  async reviewLeave(
    actorUserId: string,
    leaveId: string,
    input: { decision: "approved" | "rejected"; note: string },
  ) {
    const leave = await this.repository.findLeave(leaveId);
    if (!leave) throw new AppError("Leave request was not found", 404, "LEAVE_REQUEST_NOT_FOUND");
    if (leave.status !== "pending")
      throw new AppError("Leave request was already reviewed", 409, "LEAVE_REQUEST_REVIEWED");
    const placement = await this.requirePlacement(leave.placementId);
    this.requireReviewer(actorUserId, placement);
    return this.repository.reviewLeave({
      leave,
      reviewerUserId: actorUserId,
      decision: input.decision,
      note: input.note,
      reviewedAt: this.now(),
    });
  }

  async universitySummary(actorUserId: string, organizationId: string, from: string, to: string) {
    await this.requireRole(organizationId, actorUserId, [
      "university_admin",
      "coordinator",
      "advisor",
    ]);
    const records = await this.repository.listUniversityAttendance(organizationId, from, to);
    return {
      from,
      to,
      totalRecords: records.length,
      completedRecords: records.filter((item) => item.checkedOutAt).length,
      incompleteRecords: records.filter((item) => !item.checkedOutAt).length,
      totalNetMinutes: records.reduce((sum, item) => sum + (item.netMinutes ?? 0), 0),
      byStatus: Object.fromEntries(
        [...new Set(records.map((item) => item.status))].map((status) => [
          status,
          records.filter((item) => item.status === status).length,
        ]),
      ),
    };
  }

  private validateLocation(schedule: WorkSchedule, input: ActionInput, now: Date) {
    if (schedule.locationPolicy === "disabled") return null;
    if (!input.location) {
      if (schedule.locationPolicy === "required_onsite" && !input.locationExceptionReason)
        throw new AppError(
          "Location or an exception reason is required",
          422,
          "ATTENDANCE_LOCATION_REQUIRED",
        );
      return null;
    }
    const hasGeofence =
      schedule.geofenceLatitude != null &&
      schedule.geofenceLongitude != null &&
      schedule.geofenceRadiusMeters != null;
    const insideGeofence = hasGeofence
      ? distanceMeters(input.location, {
          latitude: schedule.geofenceLatitude!,
          longitude: schedule.geofenceLongitude!,
        }) <=
        schedule.geofenceRadiusMeters! + input.location.accuracyMeters
      : null;
    if (schedule.locationPolicy === "required_onsite" && insideGeofence === false)
      throw new AppError(
        "Location is outside the allowed work site",
        422,
        "ATTENDANCE_OUTSIDE_GEOFENCE",
      );
    return { ...input.location, capturedAt: now.toISOString(), insideGeofence };
  }

  private async requirePlacement(id: string) {
    const record = await this.repository.findPlacement(id);
    if (!record) throw new AppError("Placement was not found", 404, "PLACEMENT_NOT_FOUND");
    return record;
  }
  private async requireAttendance(id: string) {
    const record = await this.repository.findAttendance(id);
    if (!record) throw new AppError("Attendance was not found", 404, "ATTENDANCE_NOT_FOUND");
    return record;
  }
  private requireStudent(actor: string, student: string) {
    if (actor !== student)
      throw new AppError("Attendance was not found", 404, "ATTENDANCE_NOT_FOUND");
  }
  private requireReviewer(actor: string, placement: AttendancePlacement) {
    if (![placement.advisorUserId, placement.supervisorUserId].includes(actor))
      throw new AppError(
        "Assigned attendance reviewer access is required",
        403,
        "ATTENDANCE_REVIEWER_REQUIRED",
      );
  }
  private async requireRole(organizationId: string, actorUserId: string, roles: string[]) {
    const membership = await this.repository.findActiveMembership(organizationId, actorUserId);
    if (!membership || !roles.includes(membership.role))
      throw new AppError(
        "Required organization access was not found",
        403,
        "ORGANIZATION_ACCESS_REQUIRED",
      );
  }
  private async requireParticipantOrStaff(actor: string, placement: AttendancePlacement) {
    if (
      [placement.studentUserId, placement.advisorUserId, placement.supervisorUserId].includes(actor)
    )
      return;
    const company = await this.repository.findActiveMembership(
      placement.companyOrganizationId,
      actor,
    );
    const university = await this.repository.findActiveMembership(
      placement.universityOrganizationId,
      actor,
    );
    if (!company && !university)
      throw new AppError("Placement access is required", 403, "PLACEMENT_ACCESS_REQUIRED");
  }
}

function bangkokParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: weekdays[value("weekday")] ?? 0,
  };
}

function scheduleBounds(workDate: string, schedule: WorkSchedule) {
  const base = new Date(`${workDate}T00:00:00+07:00`).getTime();
  return {
    start: new Date(base + schedule.startMinute * 60_000),
    end: new Date(base + schedule.endMinute * 60_000),
  };
}
