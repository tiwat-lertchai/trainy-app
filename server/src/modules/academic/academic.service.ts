import { AppError } from "../../lib/app-error";
import type { AcademicRepository } from "./academic.repository";

export class AcademicService {
  constructor(private readonly repository: AcademicRepository) {}

  async listFaculties(organizationId: string) {
    await this.requireUniversity(organizationId);
    return this.repository.listFaculties(organizationId);
  }

  async createFaculty(actorUserId: string, organizationId: string, name: string) {
    await this.requireUniversity(organizationId);
    await this.requireAdmin(organizationId, actorUserId);
    const record = await this.repository.createFaculty(organizationId, name);
    if (!record)
      throw new AppError(
        "A faculty with this name already exists",
        409,
        "ACADEMIC_FACULTY_CONFLICT",
      );
    return record;
  }

  async listMajors(facultyId: string) {
    await this.requireFaculty(facultyId);
    return this.repository.listMajors(facultyId);
  }

  async createMajor(actorUserId: string, facultyId: string, name: string) {
    const faculty = await this.requireFaculty(facultyId);
    await this.requireAdmin(faculty.organizationId, actorUserId);
    const record = await this.repository.createMajor(facultyId, name);
    if (!record)
      throw new AppError("A major with this name already exists", 409, "ACADEMIC_MAJOR_CONFLICT");
    return record;
  }

  async setProgramChair(actorUserId: string, majorId: string, userId: string) {
    const major = await this.repository.findMajor(majorId);
    if (!major) throw new AppError("Major was not found", 404, "ACADEMIC_MAJOR_NOT_FOUND");
    const faculty = await this.requireFaculty(major.facultyId);
    await this.requireAdmin(faculty.organizationId, actorUserId);
    const membership = await this.repository.findActiveMembership(faculty.organizationId, userId);
    if (!membership || membership.role !== "advisor")
      throw new AppError(
        "The program chair must be an active advisor at this university",
        422,
        "PROGRAM_CHAIR_MUST_BE_ADVISOR",
      );
    return this.repository.setProgramChair(majorId, userId);
  }

  async setAcademicRecord(
    actorUserId: string,
    organizationId: string,
    studentUserId: string,
    input: { cumulativeGpa?: number; lastTermGpa?: number; meetsPrerequisite?: boolean },
  ) {
    await this.requireUniversity(organizationId);
    const membership = await this.repository.findActiveMembership(organizationId, actorUserId);
    if (!membership || !["university_admin", "coordinator"].includes(membership.role))
      throw new AppError(
        "University staff access is required",
        403,
        "ORGANIZATION_ACCESS_REQUIRED",
      );
    const student = await this.repository.findActiveMembership(organizationId, studentUserId);
    if (!student || student.role !== "student")
      throw new AppError("Student was not found in this university", 404, "STUDENT_NOT_FOUND");
    return this.repository.upsertAcademicRecord({
      userId: studentUserId,
      updatedByUserId: actorUserId,
      ...input,
    });
  }

  private async requireUniversity(organizationId: string) {
    const organization = await this.repository.findOrganization(organizationId);
    if (!organization || organization.status !== "active" || organization.type !== "university")
      throw new AppError("University was not found", 404, "ACADEMIC_ORGANIZATION_NOT_FOUND");
    return organization;
  }

  private async requireFaculty(facultyId: string) {
    const faculty = await this.repository.findFaculty(facultyId);
    if (!faculty) throw new AppError("Faculty was not found", 404, "ACADEMIC_FACULTY_NOT_FOUND");
    return faculty;
  }

  private async requireAdmin(organizationId: string, actorUserId: string) {
    const membership = await this.repository.findActiveMembership(organizationId, actorUserId);
    if (!membership || membership.role !== "university_admin")
      throw new AppError(
        "University administrator access is required",
        403,
        "ORGANIZATION_ADMIN_REQUIRED",
      );
  }
}
