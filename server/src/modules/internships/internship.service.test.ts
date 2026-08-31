import { describe, expect, test } from "bun:test";
import { AppError } from "../../lib/app-error";
import type {
  ApplicationRecord,
  InternshipRecord,
  InternshipRepository,
  MembershipAccess,
} from "./internship.repository";
import type { ApplicationStatus } from "./internship.schema";
import { InternshipService } from "./internship.service";

const now = new Date("2026-08-27T00:00:00.000Z");
const future = new Date("2026-09-30T00:00:00.000Z");

describe("InternshipService", () => {
  test("allows only an active company admin to create an internship", async () => {
    const repository = new MemoryInternshipRepository();
    repository.memberships.push(membership("admin", "company", "company_admin"));
    const service = createService(repository);

    const created = await service.createInternship({
      actorUserId: "admin",
      companyOrganizationId: "company",
      ...internshipInput(),
    });

    expect(created.status).toBe("draft");
    expect(created.companyOrganizationId).toBe("company");
    expect(created.type).toBe("regular");
  });

  test("rejects a supervisor creating an internship", async () => {
    const repository = new MemoryInternshipRepository();
    repository.memberships.push(membership("supervisor", "company", "supervisor"));

    expect(
      createService(repository).createInternship({
        actorUserId: "supervisor",
        companyOrganizationId: "company",
        ...internshipInput(),
      }),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
  });

  test("rejects a deadline that is not in the future", async () => {
    const repository = new MemoryInternshipRepository();
    repository.memberships.push(membership("admin", "company", "company_admin"));

    expect(
      createService(repository).createInternship({
        actorUserId: "admin",
        companyOrganizationId: "company",
        ...internshipInput(),
        applicationDeadline: now,
      }),
    ).rejects.toMatchObject({ code: "INVALID_APPLICATION_DEADLINE" });
  });

  test("publishes a draft but prevents editing published content", async () => {
    const repository = seededRepository();
    const service = createService(repository);

    const published = await service.updateInternship({
      actorUserId: "admin",
      internshipId: "internship",
      status: "published",
    });
    expect(published.status).toBe("published");

    expect(
      service.updateInternship({
        actorUserId: "admin",
        internshipId: "internship",
        title: "Changed after publishing",
      }),
    ).rejects.toMatchObject({ code: "PUBLISHED_INTERNSHIP_IMMUTABLE" });
  });

  test("allows an active university student to apply", async () => {
    const repository = seededRepository("published");
    repository.memberships.push(membership("student", "university", "student", "university"));

    const application = await createService(repository).apply({
      actorUserId: "student",
      internshipId: "internship",
      universityOrganizationId: "university",
      semester: 1,
      academicYear: 2569,
      statement: "I am ready to learn and contribute to this team.",
    });

    expect(application.status).toBe("submitted");
    expect(application.studentUserId).toBe("student");
    expect(application.semester).toBe(1);
    expect(application.academicYear).toBe(2569);
  });

  test("rejects duplicate applications", async () => {
    const repository = seededRepository("published");
    repository.memberships.push(membership("student", "university", "student", "university"));
    repository.applications.push(applicationRecord());

    expect(
      createService(repository).apply({
        actorUserId: "student",
        internshipId: "internship",
        universityOrganizationId: "university",
        semester: 1,
        academicYear: 2569,
        statement: "I am ready to learn and contribute to this team.",
      }),
    ).rejects.toMatchObject({ code: "APPLICATION_CONFLICT" });
  });

  test("rejects applications after the deadline", async () => {
    const repository = seededRepository("published");
    repository.internships[0]!.applicationDeadline = new Date("2026-08-26T00:00:00.000Z");
    repository.memberships.push(membership("student", "university", "student", "university"));

    expect(
      createService(repository).apply({
        actorUserId: "student",
        internshipId: "internship",
        universityOrganizationId: "university",
        semester: 1,
        academicYear: 2569,
        statement: "I am ready to learn and contribute to this team.",
      }),
    ).rejects.toMatchObject({ code: "APPLICATION_DEADLINE_PASSED" });
  });

  test("lets a supervisor start review but not accept an application", async () => {
    const repository = seededRepository("published");
    repository.memberships.push(membership("supervisor", "company", "supervisor"));
    repository.applications.push(applicationRecord());
    const service = createService(repository);

    expect(
      await service.reviewApplication({
        actorUserId: "supervisor",
        applicationId: "application",
        status: "under_review",
      }),
    ).toMatchObject({ status: "under_review" });

    expect(
      service.reviewApplication({
        actorUserId: "supervisor",
        applicationId: "application",
        status: "accepted",
      }),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
  });

  test("prevents changing a terminal application status", async () => {
    const repository = seededRepository("published");
    repository.applications.push(applicationRecord("accepted"));

    expect(
      createService(repository).withdrawApplication("student", "application"),
    ).rejects.toMatchObject({ code: "INVALID_APPLICATION_TRANSITION" });
  });

  test("prevents accepting more students than the internship capacity", async () => {
    const repository = seededRepository("published");
    repository.internships[0]!.capacity = 1;
    repository.applications.push(
      applicationRecord("accepted", {
        id: "accepted-application",
        studentUserId: "accepted-student",
      }),
      applicationRecord("under_review"),
    );

    expect(
      createService(repository).reviewApplication({
        actorUserId: "admin",
        applicationId: "application",
        status: "accepted",
      }),
    ).rejects.toMatchObject({ code: "INTERNSHIP_CAPACITY_REACHED" });
  });

  test("hides another student's application", async () => {
    const repository = seededRepository("published");
    repository.applications.push(applicationRecord());

    expect(
      createService(repository).withdrawApplication("outsider", "application"),
    ).rejects.toEqual(new AppError("Application was not found", 404, "APPLICATION_NOT_FOUND"));
  });
});

class MemoryInternshipRepository implements InternshipRepository {
  memberships: MembershipAccess[] = [];
  internships: InternshipRecord[] = [];
  applications: ApplicationRecord[] = [];

  async findMembership(organizationId: string, userId: string) {
    return this.memberships.find(
      (item) => item.organizationId === organizationId && item.userId === userId,
    );
  }
  async createInternship(input: Parameters<InternshipRepository["createInternship"]>[0]) {
    const record = internshipRecord("draft", input);
    this.internships.push(record);
    return record;
  }
  async findInternship(id: string) {
    return this.internships.find((item) => item.id === id);
  }
  async listPublishedInternships() {
    return this.internships.filter((item) => item.status === "published");
  }
  async listCompanyInternships(companyOrganizationId: string) {
    return this.internships.filter((item) => item.companyOrganizationId === companyOrganizationId);
  }
  async updateInternship(
    id: string,
    changes: Parameters<InternshipRepository["updateInternship"]>[1],
  ) {
    const record = this.internships.find((item) => item.id === id)!;
    Object.assign(record, changes);
    return record;
  }
  async findApplication(internshipId: string, studentUserId: string) {
    return this.applications.find(
      (item) => item.internshipId === internshipId && item.studentUserId === studentUserId,
    );
  }
  async findApplicationById(id: string) {
    return this.applications.find((item) => item.id === id);
  }
  async createApplication(input: Parameters<InternshipRepository["createApplication"]>[0]) {
    if (await this.findApplication(input.internshipId, input.studentUserId)) {
      return undefined;
    }
    const record = applicationRecord("submitted", input);
    this.applications.push(record);
    return record;
  }
  async listStudentApplications(studentUserId: string) {
    return this.applications.filter((item) => item.studentUserId === studentUserId);
  }
  async listInternshipApplications(internshipId: string) {
    return this.applications.filter((item) => item.internshipId === internshipId);
  }
  async listUniversityApplications(universityOrganizationId: string) {
    return this.applications.filter(
      (item) => item.universityOrganizationId === universityOrganizationId,
    );
  }
  async updateApplicationStatus(id: string, status: ApplicationStatus) {
    const record = this.applications.find((item) => item.id === id)!;
    record.status = status;
    return record;
  }
  async acceptApplicationWithinCapacity(id: string, internshipId: string, capacity: number) {
    const acceptedCount = this.applications.filter(
      (item) => item.internshipId === internshipId && item.status === "accepted",
    ).length;
    if (acceptedCount >= capacity) return undefined;
    return this.updateApplicationStatus(id, "accepted");
  }
}

function createService(repository: InternshipRepository) {
  return new InternshipService(repository, () => now);
}

function seededRepository(status: InternshipRecord["status"] = "draft") {
  const repository = new MemoryInternshipRepository();
  repository.memberships.push(membership("admin", "company", "company_admin"));
  repository.internships.push(internshipRecord(status));
  return repository;
}

function membership(
  userId: string,
  organizationId: string,
  role: MembershipAccess["role"],
  organizationType: MembershipAccess["organizationType"] = "company",
): MembershipAccess {
  return { organizationId, organizationType, role, status: "active", userId };
}

function internshipInput() {
  return {
    title: "Backend Engineering Intern",
    type: "regular" as const,
    description: "Build and test maintainable backend services with our engineering team.",
    location: "Bangkok",
    workMode: "hybrid" as const,
    capacity: 2,
    applicationDeadline: future,
  };
}

function internshipRecord(
  status: InternshipRecord["status"] = "draft",
  overrides: Partial<InternshipRecord> = {},
): InternshipRecord {
  return {
    id: "internship",
    companyOrganizationId: "company",
    createdByUserId: "admin",
    ...internshipInput(),
    status,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function applicationRecord(
  status: ApplicationStatus = "submitted",
  overrides: Partial<ApplicationRecord> = {},
): ApplicationRecord {
  return {
    id: "application",
    internshipId: "internship",
    studentUserId: "student",
    universityOrganizationId: "university",
    semester: 1,
    academicYear: 2569,
    statement: "I am ready to learn and contribute to this team.",
    status,
    submittedAt: now,
    updatedAt: now,
    ...overrides,
  };
}
