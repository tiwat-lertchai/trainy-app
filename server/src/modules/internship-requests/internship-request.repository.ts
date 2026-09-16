import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
  academicFaculty,
  academicMajor,
  internshipRequest,
  internshipRequestApproval,
  internshipRequestDocument,
  internshipRequestSubmission,
  organization,
  organizationMembership,
  user,
} from "../../db/schema";
import type { InternshipRequestStep } from "./internship-request.schema";

export type RequestRecord = typeof internshipRequest.$inferSelect;
export type RequestInsert = typeof internshipRequest.$inferInsert;
export type ApprovalRecord = typeof internshipRequestApproval.$inferSelect;
export type RequestWithApprovals = RequestRecord & {
  approvals: ApprovalRecord[];
  student?: { id: string; name: string; email: string };
};
type Membership = { role: string; status: "active" | "suspended" };
type MajorContext = { id: string; organizationId: string; programChairUserId: string | null };
export type RequestOrganization = Pick<typeof organization.$inferSelect, "id" | "type" | "status">;

const STEP_ORDER: readonly InternshipRequestStep[] = ["advisor", "program_chair", "center"];

export type AdvisorOption = { userId: string; name: string };

export interface InternshipRequestRepository {
  findMajorContext(majorId: string): Promise<MajorContext | undefined>;
  findOrganization(id: string): Promise<RequestOrganization | undefined>;
  findMembership(organizationId: string, userId: string): Promise<Membership | undefined>;
  listActiveAdvisors(organizationId: string): Promise<AdvisorOption[]>;
  findById(id: string): Promise<RequestWithApprovals | undefined>;
  listMine(studentUserId: string): Promise<RequestWithApprovals[]>;
  listActive(): Promise<RequestWithApprovals[]>;
  countByStatuses(studentUserId: string, statuses: RequestRecord["status"][]): Promise<number>;
  create(input: {
    request: Omit<
      RequestInsert,
      "id" | "status" | "submissionVersion" | "revisionNote" | "createdAt" | "updatedAt"
    >;
  }): Promise<RequestWithApprovals>;
  submit(input: {
    requestId: string;
    actorUserId: string;
    idempotencyKey: string;
    maxActive: number;
    reviewers: Partial<Record<InternshipRequestStep, string | null>>;
  }): Promise<RequestWithApprovals>;
  updateDraft(
    requestId: string,
    updates: Parameters<InternshipRequestRepository["resubmit"]>[1],
  ): Promise<RequestWithApprovals>;
  decideStep(input: {
    requestId: string;
    step: InternshipRequestStep;
    reviewerUserId: string;
    decision: "approved" | "rejected" | "revision_requested";
    note?: string;
  }): Promise<RequestWithApprovals>;
  resubmit(
    requestId: string,
    updates: Pick<
      RequestInsert,
      | "positionTitle"
      | "description"
      | "proposedStartDate"
      | "proposedEndDate"
      | "companyOrganizationId"
      | "companyNameProposed"
      | "companyContactName"
      | "companyContactPosition"
      | "companyContactEmail"
      | "companyContactPhone"
      | "companyAddress"
    >,
    submission: {
      actorUserId: string;
      idempotencyKey: string;
      reviewers: Partial<Record<InternshipRequestStep, string | null>>;
    },
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

  async listActiveAdvisors(organizationId: string) {
    return this.database
      .select({ userId: user.id, name: user.name })
      .from(organizationMembership)
      .innerJoin(user, eq(user.id, organizationMembership.userId))
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.role, "advisor"),
          eq(organizationMembership.status, "active"),
        ),
      )
      .orderBy(user.name);
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
      with: {
        approvals: true,
        student: { columns: { id: true, name: true, email: true } },
      },
      limit: 200,
    });
  }

  async countByStatuses(studentUserId: string, statuses: RequestRecord["status"][]) {
    const [result] = await this.database
      .select({ value: count() })
      .from(internshipRequest)
      .where(
        and(
          eq(internshipRequest.studentUserId, studentUserId),
          inArray(internshipRequest.status, statuses),
        ),
      );
    return result?.value ?? 0;
  }

  async create(input: Parameters<InternshipRequestRepository["create"]>[0]) {
    const [record] = await this.database
      .insert(internshipRequest)
      .values(input.request)
      .returning();
    if (!record) throw new Error("Database did not return the internship request");
    return { ...record, approvals: [] };
  }

  async submit(input: Parameters<InternshipRequestRepository["submit"]>[0]) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${input.actorUserId}, 0))`,
      );
      const existing = await transaction.query.internshipRequestSubmission.findFirst({
        where: and(
          eq(internshipRequestSubmission.actorUserId, input.actorUserId),
          eq(internshipRequestSubmission.idempotencyKey, input.idempotencyKey),
        ),
      });
      if (existing) {
        if (existing.requestId !== input.requestId) throw new Error("IDEMPOTENCY_KEY_REUSED");
        const replay = await transaction.query.internshipRequest.findFirst({
          where: eq(internshipRequest.id, input.requestId),
          with: { approvals: true },
        });
        if (!replay) throw new Error("Request not found");
        return replay;
      }

      const [activeCount] = await transaction
        .select({ value: count() })
        .from(internshipRequest)
        .where(
          and(
            eq(internshipRequest.studentUserId, input.actorUserId),
            inArray(internshipRequest.status, ["submitted", "revision_requested"]),
          ),
        );
      if ((activeCount?.value ?? 0) >= input.maxActive) throw new Error("ACTIVE_LIMIT_REACHED");

      const [record] = await transaction
        .update(internshipRequest)
        .set({
          status: "submitted",
          revisionNote: null,
          submissionVersion: sql`${internshipRequest.submissionVersion} + 1`,
        })
        .where(
          and(
            eq(internshipRequest.id, input.requestId),
            eq(internshipRequest.studentUserId, input.actorUserId),
            eq(internshipRequest.status, "draft"),
          ),
        )
        .returning();
      if (!record) {
        const replayAttempt = await transaction.query.internshipRequestSubmission.findFirst({
          where: and(
            eq(internshipRequestSubmission.actorUserId, input.actorUserId),
            eq(internshipRequestSubmission.idempotencyKey, input.idempotencyKey),
          ),
        });
        if (replayAttempt?.requestId === input.requestId) {
          const replay = await transaction.query.internshipRequest.findFirst({
            where: eq(internshipRequest.id, input.requestId),
            with: { approvals: true },
          });
          if (replay) return replay;
        }
        throw new Error("REQUEST_NOT_SUBMITTABLE");
      }
      await transaction.insert(internshipRequestApproval).values(
        STEP_ORDER.map((step) => ({
          requestId: record.id,
          step,
          reviewerUserId: input.reviewers[step] ?? null,
        })),
      );
      await transaction.insert(internshipRequestSubmission).values({
        requestId: record.id,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
        version: record.submissionVersion,
      });
      const approvals = await transaction.query.internshipRequestApproval.findMany({
        where: eq(internshipRequestApproval.requestId, record.id),
      });
      return { ...record, approvals };
    });
  }

  async updateDraft(
    requestId: string,
    updates: Parameters<InternshipRequestRepository["updateDraft"]>[1],
  ) {
    const [record] = await this.database
      .update(internshipRequest)
      .set({
        ...updates,
        companyOrganizationId: updates.companyOrganizationId ?? null,
        companyNameProposed: updates.companyNameProposed ?? null,
        companyContactName: updates.companyContactName ?? null,
        companyContactPosition: updates.companyContactPosition ?? null,
        companyContactEmail: updates.companyContactEmail ?? null,
        companyContactPhone: updates.companyContactPhone ?? null,
        companyAddress: updates.companyAddress ?? null,
      })
      .where(and(eq(internshipRequest.id, requestId), eq(internshipRequest.status, "draft")))
      .returning();
    if (!record) throw new Error("Request is not editable");
    return { ...record, approvals: [] };
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
    updates: Parameters<InternshipRequestRepository["resubmit"]>[1],
    submission: Parameters<InternshipRequestRepository["resubmit"]>[2],
  ) {
    return this.database.transaction(async (transaction) => {
      const existing = await transaction.query.internshipRequestSubmission.findFirst({
        where: and(
          eq(internshipRequestSubmission.actorUserId, submission.actorUserId),
          eq(internshipRequestSubmission.idempotencyKey, submission.idempotencyKey),
        ),
      });
      if (existing) {
        if (existing.requestId !== requestId) throw new Error("IDEMPOTENCY_KEY_REUSED");
        const replay = await transaction.query.internshipRequest.findFirst({
          where: eq(internshipRequest.id, requestId),
          with: { approvals: true },
        });
        if (!replay) throw new Error("Request not found");
        return replay;
      }
      const [record] = await transaction
        .update(internshipRequest)
        .set({
          ...updates,
          companyOrganizationId: updates.companyOrganizationId ?? null,
          companyNameProposed: updates.companyNameProposed ?? null,
          companyContactName: updates.companyContactName ?? null,
          companyContactPosition: updates.companyContactPosition ?? null,
          companyContactEmail: updates.companyContactEmail ?? null,
          companyContactPhone: updates.companyContactPhone ?? null,
          companyAddress: updates.companyAddress ?? null,
          status: "submitted",
          submissionVersion: sql`${internshipRequest.submissionVersion} + 1`,
          revisionNote: null,
        })
        .where(
          and(
            eq(internshipRequest.id, requestId),
            eq(internshipRequest.status, "revision_requested"),
          ),
        )
        .returning();
      if (!record) {
        const replayAttempt = await transaction.query.internshipRequestSubmission.findFirst({
          where: and(
            eq(internshipRequestSubmission.actorUserId, submission.actorUserId),
            eq(internshipRequestSubmission.idempotencyKey, submission.idempotencyKey),
          ),
        });
        if (replayAttempt?.requestId === requestId) {
          const replay = await transaction.query.internshipRequest.findFirst({
            where: eq(internshipRequest.id, requestId),
            with: { approvals: true },
          });
          if (replay) return replay;
        }
        throw new Error("Request is not awaiting resubmission");
      }
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
      await transaction.insert(internshipRequestSubmission).values({
        requestId,
        actorUserId: submission.actorUserId,
        idempotencyKey: submission.idempotencyKey,
        version: record.submissionVersion,
      });
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
          inArray(internshipRequest.status, ["draft", "submitted", "revision_requested"]),
        ),
      )
      .returning();
    if (!record) throw new Error("Request can no longer be cancelled");
    return record;
  }
}
