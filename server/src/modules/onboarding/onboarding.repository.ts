import { and, eq } from "drizzle-orm";
import type { Database } from "../../db";
import {
  onboardingRequest,
  organization,
  organizationMembership,
  platformStaff,
} from "../../db/schema";
import type { OrganizationRole } from "../organizations/organization.schema";

export type OnboardingRecord = typeof onboardingRequest.$inferSelect;
export type OnboardingInsert = typeof onboardingRequest.$inferInsert;

export interface OnboardingRepository {
  findForUser(userId: string): Promise<OnboardingRecord | undefined>;
  findById(id: string): Promise<OnboardingRecord | undefined>;
  findOrganization(id: string): Promise<typeof organization.$inferSelect | undefined>;
  findActiveMembership(
    organizationId: string,
    userId: string,
  ): Promise<typeof organizationMembership.$inferSelect | undefined>;
  isPlatformStaff(userId: string): Promise<boolean>;
  listPending(): Promise<OnboardingRecord[]>;
  listAvailableOrganizations(): Promise<
    Array<Pick<typeof organization.$inferSelect, "id" | "name" | "type">>
  >;
  createPending(input: OnboardingInsert): Promise<OnboardingRecord>;
  resubmit(requestId: string, input: OnboardingInsert): Promise<OnboardingRecord>;
  createApprovedStudent(
    input: OnboardingInsert & { targetOrganizationId: string },
  ): Promise<OnboardingRecord>;
  approve(input: {
    request: OnboardingRecord;
    reviewerUserId: string;
    note?: string;
  }): Promise<OnboardingRecord>;
  recordDecision(input: {
    requestId: string;
    reviewerUserId: string;
    status: "rejected" | "revision_requested";
    note: string;
  }): Promise<OnboardingRecord>;
}

export class DrizzleOnboardingRepository implements OnboardingRepository {
  constructor(private readonly database: Database) {}

  findForUser(userId: string) {
    return this.database.query.onboardingRequest.findFirst({
      where: eq(onboardingRequest.userId, userId),
    });
  }
  findById(id: string) {
    return this.database.query.onboardingRequest.findFirst({ where: eq(onboardingRequest.id, id) });
  }
  findOrganization(id: string) {
    return this.database.query.organization.findFirst({ where: eq(organization.id, id) });
  }
  findActiveMembership(organizationId: string, userId: string) {
    return this.database.query.organizationMembership.findFirst({
      where: and(
        eq(organizationMembership.organizationId, organizationId),
        eq(organizationMembership.userId, userId),
        eq(organizationMembership.status, "active"),
      ),
    });
  }
  async isPlatformStaff(userId: string) {
    return Boolean(
      await this.database.query.platformStaff.findFirst({
        where: and(eq(platformStaff.userId, userId), eq(platformStaff.active, true)),
      }),
    );
  }
  listPending() {
    return this.database.query.onboardingRequest.findMany({
      where: eq(onboardingRequest.status, "pending"),
      limit: 100,
    });
  }
  listAvailableOrganizations() {
    return this.database
      .select({ id: organization.id, name: organization.name, type: organization.type })
      .from(organization)
      .where(eq(organization.status, "active"));
  }

  async createPending(input: OnboardingInsert) {
    const [record] = await this.database.insert(onboardingRequest).values(input).returning();
    if (!record) throw new Error("Database did not return the onboarding request");
    return record;
  }

  async resubmit(requestId: string, input: OnboardingInsert) {
    const [record] = await this.database
      .update(onboardingRequest)
      .set({
        requestedRole: input.requestedRole,
        targetOrganizationId: input.targetOrganizationId,
        profileData: input.profileData,
        proposedOrganization: input.proposedOrganization,
        status: "pending",
        reviewerUserId: null,
        reviewNote: null,
        submittedAt: new Date(),
        reviewedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(onboardingRequest.id, requestId),
          eq(onboardingRequest.status, "revision_requested"),
        ),
      )
      .returning();
    if (!record) throw new Error("Onboarding request is no longer available for revision");
    return record;
  }

  createApprovedStudent(input: OnboardingInsert & { targetOrganizationId: string }) {
    return this.database.transaction(async (transaction) => {
      const [record] = await transaction
        .insert(onboardingRequest)
        .values({ ...input, status: "approved", reviewedAt: new Date() })
        .returning();
      if (!record) throw new Error("Database did not return the onboarding request");
      await transaction.insert(organizationMembership).values({
        organizationId: input.targetOrganizationId,
        userId: input.userId,
        role: "student",
      });
      return record;
    });
  }

  approve(input: { request: OnboardingRecord; reviewerUserId: string; note?: string }) {
    return this.database.transaction(async (transaction) => {
      let organizationId = input.request.targetOrganizationId;
      if (input.request.requestedRole === "company_admin") {
        const proposed = input.request.proposedOrganization;
        if (!proposed?.name || !proposed.slug)
          throw new Error("Company request is missing organization data");
        const [created] = await transaction
          .insert(organization)
          .values({ type: "company", name: proposed.name, slug: proposed.slug })
          .returning();
        if (!created) throw new Error("Database did not return the company");
        organizationId = created.id;
      }
      if (!organizationId) throw new Error("Approved request is missing an organization");
      await transaction.insert(organizationMembership).values({
        organizationId,
        userId: input.request.userId,
        role: input.request.requestedRole as OrganizationRole,
      });
      const [updated] = await transaction
        .update(onboardingRequest)
        .set({
          targetOrganizationId: organizationId,
          status: "approved",
          reviewerUserId: input.reviewerUserId,
          reviewNote: input.note,
          reviewedAt: new Date(),
        })
        .where(
          and(eq(onboardingRequest.id, input.request.id), eq(onboardingRequest.status, "pending")),
        )
        .returning();
      if (!updated) throw new Error("Onboarding request was already reviewed");
      return updated;
    });
  }

  async recordDecision(input: {
    requestId: string;
    reviewerUserId: string;
    status: "rejected" | "revision_requested";
    note: string;
  }) {
    const [record] = await this.database
      .update(onboardingRequest)
      .set({
        status: input.status,
        reviewerUserId: input.reviewerUserId,
        reviewNote: input.note,
        reviewedAt: new Date(),
      })
      .where(
        and(eq(onboardingRequest.id, input.requestId), eq(onboardingRequest.status, "pending")),
      )
      .returning();
    if (!record) throw new Error("Onboarding request was already reviewed");
    return record;
  }
}
