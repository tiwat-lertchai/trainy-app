import { AppError } from "../../lib/app-error";
import type {
  ApplicationRecord,
  InternshipRecord,
  InternshipRepository,
  MembershipAccess,
} from "./internship.repository";
import type {
  ApplicationStatus,
  InternshipStatus,
  InternshipType,
  InternshipWorkMode,
} from "./internship.schema";

const companyReaderRoles = ["company_admin", "supervisor"] as const;
const universityReaderRoles = ["university_admin", "coordinator", "advisor"] as const;

export class InternshipService {
  constructor(
    private readonly repository: InternshipRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createInternship(input: {
    actorUserId: string;
    companyOrganizationId: string;
    title: string;
    type: InternshipType;
    description: string;
    location: string;
    workMode: InternshipWorkMode;
    capacity: number;
    applicationDeadline: Date;
  }): Promise<InternshipRecord> {
    await this.requireMembership(input.actorUserId, input.companyOrganizationId, "company", [
      "company_admin",
    ]);
    this.requireFutureDeadline(input.applicationDeadline);

    return this.repository.createInternship({
      companyOrganizationId: input.companyOrganizationId,
      createdByUserId: input.actorUserId,
      title: input.title,
      type: input.type,
      description: input.description,
      location: input.location,
      workMode: input.workMode,
      capacity: input.capacity,
      applicationDeadline: input.applicationDeadline,
    });
  }

  listPublishedInternships() {
    return this.repository.listPublishedInternships();
  }

  async listCompanyInternships(actorUserId: string, companyOrganizationId: string) {
    await this.requireMembership(actorUserId, companyOrganizationId, "company", companyReaderRoles);
    return this.repository.listCompanyInternships(companyOrganizationId);
  }

  async getInternship(actorUserId: string, internshipId: string) {
    const internship = await this.requireInternship(internshipId);
    if (internship.status === "published") return internship;

    await this.requireMembership(
      actorUserId,
      internship.companyOrganizationId,
      "company",
      companyReaderRoles,
    );
    return internship;
  }

  async updateInternship(input: {
    actorUserId: string;
    internshipId: string;
    title?: string;
    type?: InternshipType;
    description?: string;
    location?: string;
    workMode?: InternshipWorkMode;
    capacity?: number;
    applicationDeadline?: Date;
    status?: InternshipStatus;
  }) {
    const internship = await this.requireInternship(input.internshipId);
    await this.requireMembership(input.actorUserId, internship.companyOrganizationId, "company", [
      "company_admin",
    ]);

    if (internship.status === "closed") {
      throw new AppError("A closed internship cannot be changed", 409, "INTERNSHIP_CLOSED");
    }

    const contentIsChanging = [
      input.title,
      input.type,
      input.description,
      input.location,
      input.workMode,
      input.capacity,
      input.applicationDeadline,
    ].some((value) => value !== undefined);

    if (contentIsChanging && internship.status !== "draft") {
      throw new AppError(
        "Published internship details are immutable; close and create a replacement",
        409,
        "PUBLISHED_INTERNSHIP_IMMUTABLE",
      );
    }

    if (input.status) this.assertInternshipTransition(internship.status, input.status);
    const deadline = input.applicationDeadline ?? internship.applicationDeadline;
    if (input.status === "published" || input.applicationDeadline) {
      this.requireFutureDeadline(deadline);
    }

    const { actorUserId: _actor, internshipId: _id, ...changes } = input;
    return this.repository.updateInternship(internship.id, changes);
  }

  async apply(input: {
    actorUserId: string;
    internshipId: string;
    universityOrganizationId: string;
    semester: number;
    academicYear: number;
    statement: string;
  }): Promise<ApplicationRecord> {
    const internship = await this.requireInternship(input.internshipId);
    if (internship.status !== "published") {
      throw new AppError("Internship is not accepting applications", 409, "INTERNSHIP_NOT_OPEN");
    }
    if (internship.applicationDeadline.getTime() <= this.now().getTime()) {
      throw new AppError("Application deadline has passed", 409, "APPLICATION_DEADLINE_PASSED");
    }

    await this.requireMembership(input.actorUserId, input.universityOrganizationId, "university", [
      "student",
    ]);

    if (await this.repository.findApplication(internship.id, input.actorUserId)) {
      throw new AppError("Student has already applied", 409, "APPLICATION_CONFLICT");
    }

    const application = await this.repository.createApplication({
      internshipId: internship.id,
      studentUserId: input.actorUserId,
      universityOrganizationId: input.universityOrganizationId,
      semester: input.semester,
      academicYear: input.academicYear,
      statement: input.statement,
    });
    if (!application) {
      // The unique constraint closes the race between the pre-check and insert.
      throw new AppError("Student has already applied", 409, "APPLICATION_CONFLICT");
    }
    return application;
  }

  listMyApplications(actorUserId: string) {
    return this.repository.listStudentApplications(actorUserId);
  }

  async listInternshipApplications(actorUserId: string, internshipId: string) {
    const internship = await this.requireInternship(internshipId);
    await this.requireMembership(
      actorUserId,
      internship.companyOrganizationId,
      "company",
      companyReaderRoles,
    );
    return this.repository.listInternshipApplications(internshipId);
  }

  async listUniversityApplications(actorUserId: string, universityOrganizationId: string) {
    await this.requireMembership(
      actorUserId,
      universityOrganizationId,
      "university",
      universityReaderRoles,
    );
    return this.repository.listUniversityApplications(universityOrganizationId);
  }

  async reviewApplication(input: {
    actorUserId: string;
    applicationId: string;
    status: "under_review" | "accepted" | "rejected";
  }) {
    const application = await this.requireApplication(input.applicationId);
    const internship = await this.requireInternship(application.internshipId);
    const permittedRoles =
      input.status === "under_review" ? companyReaderRoles : (["company_admin"] as const);
    await this.requireMembership(
      input.actorUserId,
      internship.companyOrganizationId,
      "company",
      permittedRoles,
    );
    this.assertApplicationTransition(application.status, input.status);
    if (input.status === "accepted") {
      const accepted = await this.repository.acceptApplicationWithinCapacity(
        application.id,
        internship.id,
        internship.capacity,
      );
      if (!accepted) {
        throw new AppError(
          "Internship capacity has been reached",
          409,
          "INTERNSHIP_CAPACITY_REACHED",
        );
      }
      return accepted;
    }
    return this.repository.updateApplicationStatus(application.id, input.status);
  }

  async withdrawApplication(actorUserId: string, applicationId: string) {
    const application = await this.requireApplication(applicationId);
    if (application.studentUserId !== actorUserId) {
      // Do not reveal an application belonging to another student.
      throw new AppError("Application was not found", 404, "APPLICATION_NOT_FOUND");
    }
    this.assertApplicationTransition(application.status, "withdrawn");
    return this.repository.updateApplicationStatus(application.id, "withdrawn");
  }

  private async requireInternship(id: string) {
    const record = await this.repository.findInternship(id);
    if (!record) throw new AppError("Internship was not found", 404, "INTERNSHIP_NOT_FOUND");
    return record;
  }

  private async requireApplication(id: string) {
    const record = await this.repository.findApplicationById(id);
    if (!record) throw new AppError("Application was not found", 404, "APPLICATION_NOT_FOUND");
    return record;
  }

  private async requireMembership(
    actorUserId: string,
    organizationId: string,
    organizationType: "university" | "company",
    allowedRoles: readonly MembershipAccess["role"][],
  ) {
    const membership = await this.repository.findMembership(organizationId, actorUserId);
    if (
      membership?.status !== "active" ||
      membership.organizationType !== organizationType ||
      !allowedRoles.includes(membership.role)
    ) {
      throw new AppError(
        "Required organization access was not found",
        403,
        "ORGANIZATION_ACCESS_REQUIRED",
      );
    }
    return membership;
  }

  private requireFutureDeadline(deadline: Date) {
    if (deadline.getTime() <= this.now().getTime()) {
      throw new AppError(
        "Application deadline must be in the future",
        422,
        "INVALID_APPLICATION_DEADLINE",
      );
    }
  }

  private assertInternshipTransition(current: InternshipStatus, next: InternshipStatus) {
    const transitions: Record<InternshipStatus, readonly InternshipStatus[]> = {
      draft: ["published", "closed"],
      published: ["closed"],
      closed: [],
    };
    if (current !== next && !transitions[current].includes(next)) {
      throw new AppError(
        `Cannot change internship from ${current} to ${next}`,
        409,
        "INVALID_INTERNSHIP_TRANSITION",
      );
    }
  }

  private assertApplicationTransition(current: ApplicationStatus, next: ApplicationStatus) {
    const transitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
      submitted: ["under_review", "accepted", "rejected", "withdrawn"],
      under_review: ["accepted", "rejected", "withdrawn"],
      accepted: [],
      rejected: [],
      withdrawn: [],
    };
    if (!transitions[current].includes(next)) {
      throw new AppError(
        `Cannot change application from ${current} to ${next}`,
        409,
        "INVALID_APPLICATION_TRANSITION",
      );
    }
  }
}
