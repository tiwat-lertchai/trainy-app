import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import type { Database } from "../../db";
import {
  attendanceAdjustmentRequest,
  attendanceRecord,
  organizationMembership,
  placement,
  placementWorkSchedule,
} from "../../db/schema";

export type AttendancePlacement = typeof placement.$inferSelect;
export type WorkSchedule = typeof placementWorkSchedule.$inferSelect;
export type AttendanceRecord = typeof attendanceRecord.$inferSelect;
export type AdjustmentRecord = typeof attendanceAdjustmentRequest.$inferSelect;

export interface AttendanceRepository {
  findPlacement(id: string): Promise<AttendancePlacement | undefined>;
  findActiveMembership(
    organizationId: string,
    userId: string,
  ): Promise<{ role: string } | undefined>;
  findSchedule(placementId: string, weekday: number): Promise<WorkSchedule | undefined>;
  replaceSchedules(
    placementId: string,
    schedules: Array<Omit<typeof placementWorkSchedule.$inferInsert, "placementId">>,
  ): Promise<WorkSchedule[]>;
  listSchedules(placementId: string): Promise<WorkSchedule[]>;
  findAttendance(id: string): Promise<AttendanceRecord | undefined>;
  findAttendanceForDate(
    placementId: string,
    workDate: string,
  ): Promise<AttendanceRecord | undefined>;
  createAttendance(
    input: typeof attendanceRecord.$inferInsert,
  ): Promise<AttendanceRecord | undefined>;
  completeAttendance(
    id: string,
    changes: Partial<AttendanceRecord>,
  ): Promise<AttendanceRecord | undefined>;
  listAttendance(placementId: string, from?: string, to?: string): Promise<AttendanceRecord[]>;
  createAdjustment(
    input: typeof attendanceAdjustmentRequest.$inferInsert,
  ): Promise<AdjustmentRecord | undefined>;
  findAdjustment(id: string): Promise<AdjustmentRecord | undefined>;
  listPendingAdjustments(placementId: string): Promise<AdjustmentRecord[]>;
  reviewAdjustment(input: {
    adjustment: AdjustmentRecord;
    reviewerUserId: string;
    decision: "approved" | "rejected";
    note: string;
    attendanceChanges?: Partial<AttendanceRecord>;
    reviewedAt: Date;
  }): Promise<AdjustmentRecord>;
  listUniversityAttendance(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<AttendanceRecord[]>;
}

export class DrizzleAttendanceRepository implements AttendanceRepository {
  constructor(private readonly database: Database) {}

  findPlacement(id: string) {
    return this.database.query.placement.findFirst({ where: eq(placement.id, id) });
  }

  async findActiveMembership(organizationId: string, userId: string) {
    const [record] = await this.database
      .select({ role: organizationMembership.role })
      .from(organizationMembership)
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.userId, userId),
          eq(organizationMembership.status, "active"),
        ),
      )
      .limit(1);
    return record;
  }

  findSchedule(placementId: string, weekday: number) {
    return this.database.query.placementWorkSchedule.findFirst({
      where: and(
        eq(placementWorkSchedule.placementId, placementId),
        eq(placementWorkSchedule.weekday, weekday),
        eq(placementWorkSchedule.active, true),
      ),
    });
  }

  replaceSchedules(
    placementId: string,
    schedules: Array<Omit<typeof placementWorkSchedule.$inferInsert, "placementId">>,
  ) {
    return this.database.transaction(async (transaction) => {
      await transaction
        .delete(placementWorkSchedule)
        .where(eq(placementWorkSchedule.placementId, placementId));
      return transaction
        .insert(placementWorkSchedule)
        .values(schedules.map((schedule) => ({ ...schedule, placementId })))
        .returning();
    });
  }

  listSchedules(placementId: string) {
    return this.database.query.placementWorkSchedule.findMany({
      where: eq(placementWorkSchedule.placementId, placementId),
      orderBy: [asc(placementWorkSchedule.weekday)],
    });
  }

  findAttendance(id: string) {
    return this.database.query.attendanceRecord.findFirst({ where: eq(attendanceRecord.id, id) });
  }

  findAttendanceForDate(placementId: string, workDate: string) {
    return this.database.query.attendanceRecord.findFirst({
      where: and(
        eq(attendanceRecord.placementId, placementId),
        eq(attendanceRecord.workDate, workDate),
      ),
    });
  }

  async createAttendance(input: typeof attendanceRecord.$inferInsert) {
    const [record] = await this.database
      .insert(attendanceRecord)
      .values(input)
      .onConflictDoNothing({ target: [attendanceRecord.placementId, attendanceRecord.workDate] })
      .returning();
    return record;
  }

  async completeAttendance(id: string, changes: Partial<AttendanceRecord>) {
    const [record] = await this.database
      .update(attendanceRecord)
      .set(changes)
      .where(and(eq(attendanceRecord.id, id), eq(attendanceRecord.status, "checked_in")))
      .returning();
    return record;
  }

  listAttendance(placementId: string, from?: string, to?: string) {
    const filters = [eq(attendanceRecord.placementId, placementId)];
    if (from) filters.push(gte(attendanceRecord.workDate, from));
    if (to) filters.push(lte(attendanceRecord.workDate, to));
    return this.database.query.attendanceRecord.findMany({
      where: and(...filters),
      orderBy: [desc(attendanceRecord.workDate)],
    });
  }

  async createAdjustment(input: typeof attendanceAdjustmentRequest.$inferInsert) {
    const [existing] = await this.database
      .select({ id: attendanceAdjustmentRequest.id })
      .from(attendanceAdjustmentRequest)
      .where(
        and(
          eq(attendanceAdjustmentRequest.attendanceId, input.attendanceId),
          eq(attendanceAdjustmentRequest.status, "pending"),
        ),
      )
      .limit(1);
    if (existing) return undefined;
    const [record] = await this.database
      .insert(attendanceAdjustmentRequest)
      .values(input)
      .returning();
    return record;
  }

  findAdjustment(id: string) {
    return this.database.query.attendanceAdjustmentRequest.findFirst({
      where: eq(attendanceAdjustmentRequest.id, id),
    });
  }

  async listPendingAdjustments(placementId: string) {
    const attendanceIds = await this.database
      .select({ id: attendanceRecord.id })
      .from(attendanceRecord)
      .where(eq(attendanceRecord.placementId, placementId));
    if (attendanceIds.length === 0) return [];
    return this.database.query.attendanceAdjustmentRequest.findMany({
      where: and(
        inArray(
          attendanceAdjustmentRequest.attendanceId,
          attendanceIds.map((item) => item.id),
        ),
        eq(attendanceAdjustmentRequest.status, "pending"),
      ),
      orderBy: [asc(attendanceAdjustmentRequest.createdAt)],
    });
  }

  reviewAdjustment(input: {
    adjustment: AdjustmentRecord;
    reviewerUserId: string;
    decision: "approved" | "rejected";
    note: string;
    attendanceChanges?: Partial<AttendanceRecord>;
    reviewedAt: Date;
  }) {
    return this.database.transaction(async (transaction) => {
      if (input.decision === "approved" && input.attendanceChanges)
        await transaction
          .update(attendanceRecord)
          .set(input.attendanceChanges)
          .where(eq(attendanceRecord.id, input.adjustment.attendanceId));
      const [record] = await transaction
        .update(attendanceAdjustmentRequest)
        .set({
          status: input.decision,
          reviewerUserId: input.reviewerUserId,
          reviewNote: input.note,
          reviewedAt: input.reviewedAt,
        })
        .where(
          and(
            eq(attendanceAdjustmentRequest.id, input.adjustment.id),
            eq(attendanceAdjustmentRequest.status, "pending"),
          ),
        )
        .returning();
      if (!record) throw new Error("Attendance adjustment was already reviewed");
      return record;
    });
  }

  async listUniversityAttendance(organizationId: string, from: string, to: string) {
    const placements = await this.database
      .select({ id: placement.id })
      .from(placement)
      .where(eq(placement.universityOrganizationId, organizationId));
    if (placements.length === 0) return [];
    return this.database.query.attendanceRecord.findMany({
      where: and(
        inArray(
          attendanceRecord.placementId,
          placements.map((item) => item.id),
        ),
        gte(attendanceRecord.workDate, from),
        lte(attendanceRecord.workDate, to),
      ),
      orderBy: [desc(attendanceRecord.workDate)],
    });
  }
}
