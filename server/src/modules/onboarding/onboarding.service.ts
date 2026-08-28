import { AppError } from "../../lib/app-error";
import type { OnboardingRecord, OnboardingRepository } from "./onboarding.repository";
import type { z } from "zod";
import type { reviewOnboardingSchema, submitOnboardingSchema } from "./onboarding.schema";

type SubmitInput = z.infer<typeof submitOnboardingSchema>;
type ReviewInput = z.infer<typeof reviewOnboardingSchema>;

export class OnboardingService {
  constructor(private readonly repository: OnboardingRepository) {}

  getMine(userId: string) {
    return this.repository.findForUser(userId);
  }
  listOrganizations() {
    return this.repository.listAvailableOrganizations();
  }

  async submit(userId: string, input: SubmitInput) {
    const existing = await this.repository.findForUser(userId);
    if (existing && existing.status !== "revision_requested")
      throw new AppError("An onboarding request already exists", 409, "ONBOARDING_REQUEST_EXISTS");
    const organizationId = "targetOrganizationId" in input ? input.targetOrganizationId : undefined;
    if (organizationId) {
      const target = await this.repository.findOrganization(organizationId);
      const expectedType = input.requestedRole === "supervisor" ? "company" : "university";
      if (!target || target.status !== "active" || target.type !== expectedType)
        throw new AppError(
          "The selected organization is unavailable",
          404,
          "ONBOARDING_ORGANIZATION_NOT_FOUND",
        );
      if (await this.repository.findActiveMembership(organizationId, userId))
        throw new AppError("An active membership already exists", 409, "MEMBERSHIP_CONFLICT");
    }
    const record = {
      userId,
      requestedRole: input.requestedRole,
      targetOrganizationId: organizationId,
      profileData: input.profile,
      proposedOrganization: "organization" in input ? input.organization : undefined,
    };
    if (existing) return this.repository.resubmit(existing.id, record);
    return input.requestedRole === "student"
      ? this.repository.createApprovedStudent({
          ...record,
          targetOrganizationId: input.targetOrganizationId,
        })
      : this.repository.createPending(record);
  }

  async listReviews(reviewerUserId: string) {
    const requests = await this.repository.listPending();
    const allowed: OnboardingRecord[] = [];
    for (const request of requests)
      if (await this.canReview(reviewerUserId, request)) allowed.push(request);
    return allowed;
  }

  async review(reviewerUserId: string, requestId: string, input: ReviewInput) {
    const request = await this.repository.findById(requestId);
    if (!request || request.status !== "pending")
      throw new AppError("Onboarding request was not found", 404, "ONBOARDING_REQUEST_NOT_FOUND");
    if (!(await this.canReview(reviewerUserId, request)))
      throw new AppError(
        "Onboarding review access is required",
        403,
        "ONBOARDING_REVIEW_FORBIDDEN",
      );
    if (
      input.decision === "approved" &&
      request.requestedRole === "company_admin" &&
      input.documentsVerified !== true
    )
      throw new AppError(
        "Company documents must be verified",
        422,
        "COMPANY_DOCUMENTS_NOT_VERIFIED",
      );
    if (input.decision === "approved")
      return this.repository.approve({ request, reviewerUserId, note: input.note });
    return this.repository.recordDecision({
      requestId,
      reviewerUserId,
      status: input.decision,
      note: input.note!,
    });
  }

  private async canReview(userId: string, request: OnboardingRecord) {
    if (["company_admin", "university_admin"].includes(request.requestedRole))
      return this.repository.isPlatformStaff(userId);
    if (!request.targetOrganizationId) return false;
    const membership = await this.repository.findActiveMembership(
      request.targetOrganizationId,
      userId,
    );
    if (request.requestedRole === "supervisor") return membership?.role === "company_admin";
    return membership?.role === "university_admin";
  }
}
