import { desc, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { placement, progressReport } from "../../db/schema";

export type ProgressRecord = typeof progressReport.$inferSelect;
export type ProgressPlacement = Pick<
  typeof placement.$inferSelect,
  "id" | "studentUserId" | "advisorUserId" | "supervisorUserId" | "status"
>;
export interface ProgressRepository {
  findPlacement(id: string): Promise<ProgressPlacement | undefined>;
  findReport(id: string): Promise<ProgressRecord | undefined>;
  create(
    input: Pick<
      ProgressRecord,
      "placementId" | "studentUserId" | "periodStart" | "periodEnd" | "summary" | "hoursWorked"
    >,
  ): Promise<ProgressRecord | undefined>;
  update(
    id: string,
    changes: Partial<
      Pick<
        ProgressRecord,
        | "periodStart"
        | "periodEnd"
        | "summary"
        | "hoursWorked"
        | "status"
        | "reviewerUserId"
        | "feedback"
        | "submittedAt"
        | "reviewedAt"
      >
    >,
  ): Promise<ProgressRecord>;
  listForPlacement(placementId: string): Promise<ProgressRecord[]>;
}

export class DrizzleProgressRepository implements ProgressRepository {
  constructor(private readonly database: Database) {}
  findPlacement(id: string) {
    return this.database.query.placement.findFirst({
      columns: {
        id: true,
        studentUserId: true,
        advisorUserId: true,
        supervisorUserId: true,
        status: true,
      },
      where: eq(placement.id, id),
    });
  }
  findReport(id: string) {
    return this.database.query.progressReport.findFirst({
      where: eq(progressReport.id, id),
    });
  }
  async create(input: Parameters<ProgressRepository["create"]>[0]) {
    const [record] = await this.database
      .insert(progressReport)
      .values(input)
      .onConflictDoNothing({
        target: [progressReport.placementId, progressReport.periodStart, progressReport.periodEnd],
      })
      .returning();
    return record;
  }
  async update(id: string, changes: Parameters<ProgressRepository["update"]>[1]) {
    const [record] = await this.database
      .update(progressReport)
      .set(changes)
      .where(eq(progressReport.id, id))
      .returning();
    if (!record) throw new Error("Database did not return the updated progress report");
    return record;
  }
  listForPlacement(placementId: string) {
    return this.database.query.progressReport.findMany({
      where: eq(progressReport.placementId, placementId),
      orderBy: [desc(progressReport.periodStart)],
    });
  }
}
