import { AppError } from "../../lib/app-error";
import type {
  InternshipRequestRepository,
  RequestWithApprovals,
} from "./internship-request.repository";
import { internshipRequestSteps, type InternshipRequestStep } from "./internship-request.schema";
import type { StudentProfileReadiness } from "../student-profile/student-profile.repository";

const universityManagerRoles = ["university_admin", "coordinator"] as const;
const MAX_DRAFT_REQUESTS = 5;
const MAX_ACTIVE_REQUESTS = 2;

function notFound() {
  return new AppError("Internship request was not found", 404, "INTERNSHIP_REQUEST_NOT_FOUND");
}

function currentStep(request: RequestWithApprovals): InternshipRequestStep | undefined {
  for (const step of internshipRequestSteps) {
    const approval = request.approvals.find((item) => item.step === step);
    if (approval?.decision === "pending") return step;
  }
  return undefined;
}

export class InternshipRequestService {
  constructor(
    private readonly repository: InternshipRequestRepository,
    private readonly studentProfiles: StudentProfileReadiness = {
      isComplete: async () => true,
    },
  ) {}

  async createDraft(input: {
    actorUserId: string;
    universityOrganizationId: string;
    academicMajorId: string;
    type: "regular" | "cooperative";
    semester: number;
    academicYear: number;
    positionTitle: string;
    description: string;
    proposedStartDate: Date;
    proposedEndDate: Date;
    advisorUserId: string;
    companyOrganizationId?: string;
    companyNameProposed?: string;
    companyContactName?: string;
    companyContactPosition?: string;
    companyContactEmail?: string;
    companyContactPhone?: string;
    companyAddress?: string;
  }): Promise<RequestWithApprovals> {
    await this.requireMembership(input.actorUserId, input.universityOrganizationId, ["student"]);
    if (!(await this.studentProfiles.isComplete(input.actorUserId))) {
      throw new AppError(
        "Complete the student profile before creating an internship request",
        422,
        "STUDENT_PROFILE_INCOMPLETE",
      );
    }
    const major = await this.repository.findMajorContext(input.academicMajorId);
    if (!major || major.organizationId !== input.universityOrganizationId)
      throw new AppError("Academic major was not found", 404, "ACADEMIC_MAJOR_NOT_FOUND");
    await this.requireMembership(input.advisorUserId, input.universityOrganizationId, ["advisor"]);

    if (input.companyOrganizationId) {
      const company = await this.repository.findOrganization(input.companyOrganizationId);
      if (!company || company.status !== "active" || company.type !== "company")
        throw new AppError("Company was not found", 404, "COMPANY_NOT_FOUND");
    }

    if ((await this.repository.countByStatuses(input.actorUserId, ["draft"])) >= MAX_DRAFT_REQUESTS)
      throw new AppError("Draft request limit reached", 409, "DRAFT_REQUEST_LIMIT_REACHED");

    return this.repository.create({
      request: {
        studentUserId: input.actorUserId,
        universityOrganizationId: input.universityOrganizationId,
        academicMajorId: input.academicMajorId,
        type: input.type,
        semester: input.semester,
        academicYear: input.academicYear,
        positionTitle: input.positionTitle,
        description: input.description,
        proposedStartDate: input.proposedStartDate,
        proposedEndDate: input.proposedEndDate,
        advisorUserId: input.advisorUserId,
        companyOrganizationId: input.companyOrganizationId,
        companyNameProposed: input.companyNameProposed,
        companyContactName: input.companyContactName,
        companyContactPosition: input.companyContactPosition,
        companyContactEmail: input.companyContactEmail,
        companyContactPhone: input.companyContactPhone,
        companyAddress: input.companyAddress,
      },
    });
  }

  /** Compatibility helper for service callers that still need create-and-submit semantics. */
  async createRequest(input: Parameters<InternshipRequestService["createDraft"]>[0]) {
    const draft = await this.createDraft(input);
    return this.submit(input.actorUserId, draft.id, crypto.randomUUID());
  }

  async submit(actorUserId: string, requestId: string, idempotencyKey: string) {
    const request = await this.repository.findById(requestId);
    if (!request) throw notFound();
    if (request.studentUserId !== actorUserId)
      throw new AppError("Only the requesting student can submit", 403, "STUDENT_ONLY");
    if (request.status !== "draft") {
      try {
        return await this.repository.submit({
          requestId,
          actorUserId,
          idempotencyKey,
          maxActive: MAX_ACTIVE_REQUESTS,
          reviewers: {},
        });
      } catch (error) {
        if (error instanceof Error && error.message === "IDEMPOTENCY_KEY_REUSED")
          throw new AppError(
            "Idempotency key was used for another request",
            409,
            "IDEMPOTENCY_KEY_REUSED",
          );
        throw new AppError("Request is not a draft", 409, "REQUEST_NOT_SUBMITTABLE");
      }
    }
    const reviewers = await this.resolveSubmissionReviewers(request);
    try {
      return await this.repository.submit({
        requestId,
        actorUserId,
        idempotencyKey,
        maxActive: MAX_ACTIVE_REQUESTS,
        reviewers,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "IDEMPOTENCY_KEY_REUSED")
        throw new AppError(
          "Idempotency key was used for another request",
          409,
          "IDEMPOTENCY_KEY_REUSED",
        );
      if (error instanceof Error && error.message === "ACTIVE_LIMIT_REACHED")
        throw new AppError("Active request limit reached", 409, "ACTIVE_REQUEST_LIMIT_REACHED");
      throw new AppError("Request can no longer be submitted", 409, "REQUEST_NOT_SUBMITTABLE");
    }
  }

  async updateDraft(
    actorUserId: string,
    requestId: string,
    updates: Parameters<InternshipRequestRepository["updateDraft"]>[1],
  ) {
    const request = await this.repository.findById(requestId);
    if (!request) throw notFound();
    if (request.studentUserId !== actorUserId)
      throw new AppError("Only the requesting student can edit", 403, "STUDENT_ONLY");
    if (request.status !== "draft")
      throw new AppError("Request is not editable", 409, "REQUEST_NOT_EDITABLE");
    if (updates.companyOrganizationId) {
      const company = await this.repository.findOrganization(updates.companyOrganizationId);
      if (!company || company.status !== "active" || company.type !== "company")
        throw new AppError("Company was not found", 404, "COMPANY_NOT_FOUND");
    }
    return this.repository.updateDraft(requestId, updates);
  }

  async reviewStep(input: {
    actorUserId: string;
    requestId: string;
    step: InternshipRequestStep;
    decision: "approved" | "rejected" | "revision_requested";
    note?: string;
  }): Promise<RequestWithApprovals> {
    const request = await this.repository.findById(input.requestId);
    if (!request) throw notFound();
    if (!["submitted", "revision_requested"].includes(request.status))
      throw new AppError("This request is no longer open for review", 409, "REQUEST_NOT_OPEN");

    const active = currentStep(request);
    if (active !== input.step)
      throw new AppError(
        "This step is not currently open for review — steps must be approved in order",
        409,
        "STEP_OUT_OF_ORDER",
      );

    const approval = request.approvals.find((item) => item.step === input.step);
    if (!approval) throw notFound();

    let reviewerUserId = approval.reviewerUserId;
    if (input.step === "center") {
      await this.requireMembership(
        input.actorUserId,
        request.universityOrganizationId,
        universityManagerRoles,
      );
      reviewerUserId = input.actorUserId;
    } else {
      if (approval.reviewerUserId !== input.actorUserId)
        throw new AppError(
          "Only the assigned reviewer can decide this step",
          403,
          "STEP_REVIEWER_REQUIRED",
        );
    }

    try {
      return await this.repository.decideStep({
        requestId: input.requestId,
        step: input.step,
        reviewerUserId: reviewerUserId!,
        decision: input.decision,
        note: input.note,
      });
    } catch {
      throw new AppError("This step was already decided", 409, "STEP_ALREADY_DECIDED");
    }
  }

  async resubmit(
    actorUserId: string,
    requestId: string,
    updates: NonNullable<Parameters<InternshipRequestRepository["resubmit"]>[1]>,
    idempotencyKey: string = crypto.randomUUID(),
  ) {
    const request = await this.repository.findById(requestId);
    if (!request) throw notFound();
    if (request.studentUserId !== actorUserId)
      throw new AppError("Only the requesting student can resubmit", 403, "STUDENT_ONLY");
    if (request.status !== "revision_requested") {
      try {
        return await this.repository.resubmit(requestId, updates, {
          actorUserId,
          idempotencyKey,
          reviewers: {},
        });
      } catch (error) {
        if (error instanceof Error && error.message === "IDEMPOTENCY_KEY_REUSED")
          throw new AppError(
            "Idempotency key was used for another request",
            409,
            "IDEMPOTENCY_KEY_REUSED",
          );
        throw new AppError("Request is not awaiting resubmission", 409, "REQUEST_NOT_REVISABLE");
      }
    }
    if (updates.companyOrganizationId) {
      const company = await this.repository.findOrganization(updates.companyOrganizationId);
      if (!company || company.status !== "active" || company.type !== "company")
        throw new AppError("Company was not found", 404, "COMPANY_NOT_FOUND");
    }
    try {
      return await this.repository.resubmit(requestId, updates, {
        actorUserId,
        idempotencyKey,
        reviewers: {},
      });
    } catch (error) {
      if (error instanceof Error && error.message === "IDEMPOTENCY_KEY_REUSED")
        throw new AppError(
          "Idempotency key was used for another request",
          409,
          "IDEMPOTENCY_KEY_REUSED",
        );
      throw new AppError("Request is not awaiting resubmission", 409, "REQUEST_NOT_REVISABLE");
    }
  }

  async cancelRequest(actorUserId: string, requestId: string) {
    const request = await this.repository.findById(requestId);
    if (!request) throw notFound();
    if (request.studentUserId !== actorUserId)
      throw new AppError("Only the requesting student can cancel", 403, "STUDENT_ONLY");
    try {
      return await this.repository.cancel(requestId);
    } catch {
      throw new AppError("Request can no longer be cancelled", 409, "REQUEST_NOT_CANCELLABLE");
    }
  }

  getMine(userId: string) {
    return this.repository.listMine(userId);
  }

  async listAdvisorOptions(actorUserId: string, universityOrganizationId: string) {
    const membership = await this.repository.findMembership(universityOrganizationId, actorUserId);
    if (membership?.status !== "active")
      throw new AppError(
        "Required organization access was not found",
        403,
        "ORGANIZATION_ACCESS_REQUIRED",
      );
    return this.repository.listActiveAdvisors(universityOrganizationId);
  }

  async listForReview(actorUserId: string) {
    const active = await this.repository.listActive();
    const reviewerMemberships = new Map<
      string,
      Awaited<ReturnType<InternshipRequestRepository["findMembership"]>>
    >();
    const result: RequestWithApprovals[] = [];
    for (const request of active) {
      const step = currentStep(request);
      if (!step) continue;
      const approval = request.approvals.find((item) => item.step === step);
      if (!approval) continue;
      if (step === "center") {
        if (!reviewerMemberships.has(request.universityOrganizationId)) {
          reviewerMemberships.set(
            request.universityOrganizationId,
            await this.repository.findMembership(request.universityOrganizationId, actorUserId),
          );
        }
        const membership = reviewerMemberships.get(request.universityOrganizationId);
        if (
          membership?.status === "active" &&
          universityManagerRoles.includes(
            membership.role as (typeof universityManagerRoles)[number],
          )
        )
          result.push(request);
      } else if (approval.reviewerUserId === actorUserId) {
        result.push(request);
      }
    }
    return result;
  }

  private async requireMembership(
    userId: string,
    organizationId: string,
    roles: readonly string[],
  ) {
    const membership = await this.repository.findMembership(organizationId, userId);
    if (membership?.status !== "active" || !roles.includes(membership.role)) {
      throw new AppError(
        "Required organization access was not found",
        403,
        "ORGANIZATION_ACCESS_REQUIRED",
      );
    }
    return membership;
  }

  private async resolveSubmissionReviewers(request: RequestWithApprovals) {
    await this.requireMembership(request.studentUserId, request.universityOrganizationId, [
      "student",
    ]);
    await this.requireMembership(request.advisorUserId, request.universityOrganizationId, [
      "advisor",
    ]);
    const major = await this.repository.findMajorContext(request.academicMajorId);
    if (!major || major.organizationId !== request.universityOrganizationId)
      throw new AppError("Academic major was not found", 404, "ACADEMIC_MAJOR_NOT_FOUND");
    if (!major.programChairUserId)
      throw new AppError(
        "This major has no program chair assigned yet",
        422,
        "PROGRAM_CHAIR_NOT_ASSIGNED",
      );
    if (request.companyOrganizationId) {
      const company = await this.repository.findOrganization(request.companyOrganizationId);
      if (!company || company.status !== "active" || company.type !== "company")
        throw new AppError("Company was not found", 404, "COMPANY_NOT_FOUND");
    }
    return {
      advisor: request.advisorUserId,
      program_chair: major.programChairUserId,
      center: null,
    };
  }
}
