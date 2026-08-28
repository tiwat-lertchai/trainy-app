import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db";
import {
  academicFaculty,
  academicMajor,
  internshipRequest,
  internshipRequestApproval,
  internshipRequestDocument,
  organization,
  organizationMembership,
} from "../../db/schema";
import type { InternshipRequestStep } from "./internship-request.schema";

export type RequestRecord = typeof internshipRequest.$inferSelect;
export type RequestInsert = typeof internshipRequest.$inferInsert;
export type ApprovalRecord = typeof internshipRequestApproval.$inferSelect;
export type RequestWithApprovals = RequestRecord & { approvals: ApprovalRecord[] };
type Membership = { role: string; status: "active" | "suspended" };
type MajorContext = { id: string; organizationId: string; programChairUserId: string | null };
export type RequestOrganization = Pick<typeof organization.$inferSelect, "id" | "type" | "status">;

const STEP_ORDER: readonly InternshipRequestStep[] = ["advisor", "program_chair", "center"];

export interface InternshipRequestRepository {
  findMajorContext(majorId: string): Promise<MajorContext | undefined>;
  findOrganization(id: string): Promise<RequestOrganization | undefined>;
  findMembership(organizationId: string, userId: string): Promise<Membership | undefined>;
  findById(id: string): Promise<RequestWithApprovals | undefined>;
  listMine(studentUserId: string): Promise<RequestWithApprovals[]>;
  listActive(): Promise<RequestWithApprovals[]>;
  create(input: {
    request: Omit<RequestInsert, "id" | "status" | "revisionNote" | "createdAt" | "updatedAt">;
    reviewers: Partial<Record<InternshipRequestStep, string | null>>;
  }): Promise<RequestWithApprovals>;
  decideStep(input: {
    requestId: string;
    step: InternshipRequestStep;
    reviewerUserId: string;
    decision: "approved" | "rejected" | "revision_requested";
    note?: string;
  }): Promise<RequestWithApprovals>;
  resubmit(
    requestId: string,
    updates?: Partial<
      Pick<
        RequestInsert,
        | "positionTitle"
        | "description"
        | "proposedStartDate"
        | "proposedEndDate"
        | "companyOrganizationId"
        | "companyNameProposed"
        | "companyContactName"
        | "companyContactEmail"
        | "companyContactPhone"
      >
    >,
  ): Promise<RequestWithApprovals>;
  cancel(requestId: string): Promise<RequestRecord>;
}

export class DrizzleInternshipRequestRepository implements InternshipRequestRepository {
  constructor(private readonly database: Database) {}

  async findMajorContext(majorId: string) {
    const [record] = await this.database
      .select({
        id: academicMajor.id,
        organizationId: academicFaculty.organizationId,
        programChairUserId: academicMajor.programChairUserId,
      })
      .from(academicMajor)
      .innerJoin(academicFaculty, eq(academicFaculty.id, academicMajor.facultyId))
      .where(eq(academicMajor.id, majorId))
      .limit(1);
    return record;
  }

  findOrganization(id: string) {
    return this.database.query.organization.findFirst({ where: eq(organization.id, id) });
  }

  findMembership(organizationId: string, userId: string) {
    return this.database.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
      ),
    });
  }

  findById(id: string) {
    return this.database.query.internshipRequest.findFirst({
      where: eq(internshipRequest.id, id),
      with: { approvals: true },
    });
  }

  listMine(studentUserId: string) {
    return this.database.query.internshipRequest.findMany({
      where: eq(internshipRequest.studentUserId, studentUserId),
      with: { approvals: true },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });
  }

  listActive() {
    return this.database.query.internshipRequest.findMany({
      where: (table, { inArray }) => inArray(table.status, ["submitted", "revision_requested"]),
      with: { approvals: true },
      limit: 200,
    });
  }

  async create(input: Parameters<InternshipRequestRepository["create"]>[0]) {
    return this.database.transaction(async (transaction) => {
      const [record] = await transaction
        .insert(internshipRequest)
        .values(input.request)
        .returning();
      if (!record) throw new Error("Database did not return the internship request");
      await transaction.insert(internshipRequestApproval).values(
        STEP_ORDER.map((step) => ({
          requestId: record.id,
          step,
          reviewerUserId: input.reviewers[step] ?? null,
        })),
      );
      const approvals = await transaction.query.internshipRequestApproval.findMany({
        where: eq(internshipRequestApproval.requestId, record.id),
      });
      return { ...record, approvals };
    });
  }

  async decideStep(input: Parameters<InternshipRequestRepository["decideStep"]>[0]) {
    return this.database.transaction(async (transaction) => {
      const [approval] = await transaction
        .update(internshipRequestApproval)
        .set({
          decision: input.decision,
          reviewerUserId: input.reviewerUserId,
          note: input.note,
          decidedAt: new Date(),
        })
        .where(
          and(
            eq(internshipRequestApproval.requestId, input.requestId),
            eq(internshipRequestApproval.step, input.step),
            eq(internshipRequestApproval.decision, "pending"),
          ),
        )
        .returning();
      if (!approval) throw new Error("This step was already decided");

      const isLastStep = input.step === STEP_ORDER[STEP_ORDER.length - 1];
      if (input.decision === "rejected") {
        await transaction
          .update(internshipRequest)
          .set({ status: "rejected" })
          .where(eq(internshipRequest.id, input.requestId));
      } else if (input.decision === "revision_requested") {
        await transaction
          .update(internshipRequest)
          .set({ status: "revision_requested", revisionNote: input.note })
          .where(eq(internshipRequest.id, input.requestId));
      } else if (input.decision === "approved" && isLastStep) {
        await transaction
          .update(internshipRequest)
          .set({ status: "approved" })
          .where(eq(internshipRequest.id, input.requestId));
        await transaction.insert(internshipRequestDocument).values([
          { requestId: input.requestId, type: "cooperation_request_letter" },
          { requestId: input.requestId, type: "referral_letter" },
        ]);
      }

      const record = await transaction.query.internshipRequest.findFirst({
        where: eq(internshipRequest.id, input.requestId),
        with: { approvals: true },
      });
      if (!record) throw new Error("Database did not return the internship request");
      return record;
    });
  }

  async resubmit(
    requestId: string,
    updates?: Parameters<InternshipRequestRepository["resubmit"]>[1],
  ) {
    return this.database.transaction(async (transaction) => {
      const [record] = await transaction
        .update(internshipRequest)
        .set({ ...updates, status: "submitted", revisionNote: null })
        .where(
          and(
            eq(internshipRequest.id, requestId),
            eq(internshipRequest.status, "revision_requested"),
          ),
        )
        .returning();
      if (!record) throw new Error("Request is not awaiting resubmission");
      await transaction
        .update(internshipRequestApproval)
        .set({ decision: "pending", note: null, decidedAt: null })
        .where(eq(internshipRequestApproval.requestId, requestId));
      // The center step is re-opened to be claimed again by anyone qualified.
      await transaction
        .update(internshipRequestApproval)
        .set({ reviewerUserId: null })
        .where(
          and(
            eq(internshipRequestApproval.requestId, requestId),
            eq(internshipRequestApproval.step, "center"),
          ),
        );
      const approvals = await transaction.query.internshipRequestApproval.findMany({
        where: eq(internshipRequestApproval.requestId, requestId),
      });
      return { ...record, approvals };
    });
  }

  async cancel(requestId: string) {
    const [record] = await this.database
      .update(internshipRequest)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(internshipRequest.id, requestId),
          inArray(internshipRequest.status, ["submitted", "revision_requested"]),
        ),
      )
      .returning();
    if (!record) throw new Error("Request can no longer be cancelled");
    return record;
  }
}
