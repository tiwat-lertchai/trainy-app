import { asc, desc, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { cwieEntry, cwieMonthlySummary, cwieVisit, placement } from "../../db/schema";

export type CwieEntryRecord = typeof cwieEntry.$inferSelect;
export type CwieVisitRecord = typeof cwieVisit.$inferSelect;
export type CwieMonthlySummaryRecord = typeof cwieMonthlySummary.$inferSelect;
export type CwiePlacement = Pick<
  typeof placement.$inferSelect,
  "id" | "studentUserId" | "advisorUserId" | "supervisorUserId" | "startDate" | "endDate" | "status"
>;

type EntryCreate = Omit<
  typeof cwieEntry.$inferInsert,
  | "id"
  | "status"
  | "advisorDecision"
  | "advisorComment"
  | "advisorReviewedByUserId"
  | "advisorReviewedAt"
  | "supervisorDecision"
  | "supervisorComment"
  | "supervisorReviewedByUserId"
  | "supervisorReviewedAt"
  | "submittedAt"
  | "createdAt"
  | "updatedAt"
>;
type VisitCreate = Omit<typeof cwieVisit.$inferInsert, "id" | "status" | "createdAt" | "updatedAt">;
type SummaryCreate = Omit<
  typeof cwieMonthlySummary.$inferInsert,
  | "id"
  | "status"
  | "advisorDecision"
  | "advisorComment"
  | "advisorReviewedByUserId"
  | "advisorReviewedAt"
  | "supervisorDecision"
  | "supervisorComment"
  | "supervisorReviewedByUserId"
  | "supervisorReviewedAt"
  | "submittedAt"
  | "createdAt"
  | "updatedAt"
>;

export interface CwieRepository {
  findPlacement(id: string): Promise<CwiePlacement | undefined>;
  findEntry(id: string): Promise<CwieEntryRecord | undefined>;
  createEntry(input: EntryCreate): Promise<CwieEntryRecord | undefined>;
  updateEntry(id: string, changes: Partial<CwieEntryRecord>): Promise<CwieEntryRecord>;
  listEntries(placementId: string): Promise<CwieEntryRecord[]>;
  findVisit(id: string): Promise<CwieVisitRecord | undefined>;
  createVisit(input: VisitCreate): Promise<CwieVisitRecord | undefined>;
  updateVisit(id: string, changes: Partial<CwieVisitRecord>): Promise<CwieVisitRecord>;
  listVisits(placementId: string): Promise<CwieVisitRecord[]>;
  findSummary(id: string): Promise<CwieMonthlySummaryRecord | undefined>;
  createSummary(input: SummaryCreate): Promise<CwieMonthlySummaryRecord | undefined>;
  updateSummary(
    id: string,
    changes: Partial<CwieMonthlySummaryRecord>,
  ): Promise<CwieMonthlySummaryRecord>;
  listSummaries(placementId: string): Promise<CwieMonthlySummaryRecord[]>;
}

export class DrizzleCwieRepository implements CwieRepository {
  constructor(private readonly database: Database) {}

  findPlacement(id: string) {
    return this.database.query.placement.findFirst({
      columns: {
        id: true,
        studentUserId: true,
        advisorUserId: true,
        supervisorUserId: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      where: eq(placement.id, id),
    });
  }

  findEntry(id: string) {
    return this.database.query.cwieEntry.findFirst({ where: eq(cwieEntry.id, id) });
  }

  async createEntry(input: EntryCreate) {
    const [record] = await this.database
      .insert(cwieEntry)
      .values(input)
      .onConflictDoNothing()
      .returning();
    return record;
  }

  async updateEntry(id: string, changes: Partial<CwieEntryRecord>) {
    const [record] = await this.database
      .update(cwieEntry)
      .set(changes)
      .where(eq(cwieEntry.id, id))
      .returning();
    if (!record) throw new Error("Database did not return the updated CWIE entry");
    return record;
  }

  listEntries(placementId: string) {
    return this.database.query.cwieEntry.findMany({
      where: eq(cwieEntry.placementId, placementId),
      orderBy: [desc(cwieEntry.workDate), desc(cwieEntry.periodStart), desc(cwieEntry.createdAt)],
    });
  }

  findVisit(id: string) {
    return this.database.query.cwieVisit.findFirst({ where: eq(cwieVisit.id, id) });
  }

  async createVisit(input: VisitCreate) {
    const [record] = await this.database
      .insert(cwieVisit)
      .values(input)
      .onConflictDoNothing()
      .returning();
    return record;
  }

  async updateVisit(id: string, changes: Partial<CwieVisitRecord>) {
    const [record] = await this.database
      .update(cwieVisit)
      .set(changes)
      .where(eq(cwieVisit.id, id))
      .returning();
    if (!record) throw new Error("Database did not return the updated CWIE visit");
    return record;
  }

  listVisits(placementId: string) {
    return this.database.query.cwieVisit.findMany({
      where: eq(cwieVisit.placementId, placementId),
      orderBy: [asc(cwieVisit.visitNumber)],
    });
  }

  findSummary(id: string) {
    return this.database.query.cwieMonthlySummary.findFirst({
      where: eq(cwieMonthlySummary.id, id),
    });
  }

  async createSummary(input: SummaryCreate) {
    const [record] = await this.database
      .insert(cwieMonthlySummary)
      .values(input)
      .onConflictDoNothing()
      .returning();
    return record;
  }

  async updateSummary(id: string, changes: Partial<CwieMonthlySummaryRecord>) {
    const [record] = await this.database
      .update(cwieMonthlySummary)
      .set(changes)
      .where(eq(cwieMonthlySummary.id, id))
      .returning();
    if (!record) throw new Error("Database did not return the updated CWIE monthly summary");
    return record;
  }

  listSummaries(placementId: string) {
    return this.database.query.cwieMonthlySummary.findMany({
      where: eq(cwieMonthlySummary.placementId, placementId),
      orderBy: [desc(cwieMonthlySummary.month)],
    });
  }
}
