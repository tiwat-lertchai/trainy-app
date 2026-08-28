import { describe, expect, test } from "bun:test";
import type { AcademicOrganization, AcademicRepository, FacultyRecord, MajorRecord } from "./academic.repository";
import { AcademicService } from "./academic.service";

describe("AcademicService", () => {
  test("rejects listing faculties for a company organization", () => {
    const repository = seededRepository();
    repository.organization.type = "company";
    expect(new AcademicService(repository).listFaculties("university")).rejects.toMatchObject({ code: "ACADEMIC_ORGANIZATION_NOT_FOUND" });
  });

  test("lists faculties for an active university", async () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    const faculties = await new AcademicService(repository).listFaculties("university");
    expect(faculties).toHaveLength(1);
  });

  test("rejects creating a faculty without university admin access", () => {
    const repository = seededRepository();
    expect(
      new AcademicService(repository).createFaculty("outsider", "university", "คณะวิทยาศาสตร์"),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });

  test("lets a university admin create a faculty", async () => {
    const repository = seededRepository();
    const record = await new AcademicService(repository).createFaculty("admin", "university", "คณะวิทยาศาสตร์");
    expect(record).toMatchObject({ name: "คณะวิทยาศาสตร์" });
  });

  test("rejects a duplicate faculty name", () => {
    const repository = seededRepository();
    repository.faculties.push(faculty({ name: "คณะวิทยาศาสตร์" }));
    expect(
      new AcademicService(repository).createFaculty("admin", "university", "คณะวิทยาศาสตร์"),
    ).rejects.toMatchObject({ code: "ACADEMIC_FACULTY_CONFLICT" });
  });

  test("rejects majors for an unknown faculty", () => {
    const repository = seededRepository();
    expect(new AcademicService(repository).listMajors("missing")).rejects.toMatchObject({ code: "ACADEMIC_FACULTY_NOT_FOUND" });
  });

  test("lets a university admin create a major under their faculty", async () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    const record = await new AcademicService(repository).createMajor("admin", "faculty", "วิทยาการคอมพิวเตอร์");
    expect(record).toMatchObject({ name: "วิทยาการคอมพิวเตอร์", facultyId: "faculty" });
  });

  test("rejects a major created by an admin of a different university", () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    repository.memberships.set("other-admin", "outsider-org");
    expect(
      new AcademicService(repository).createMajor("other-admin", "faculty", "วิทยาการคอมพิวเตอร์"),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });
});

class MemoryAcademicRepository implements AcademicRepository {
  organization: AcademicOrganization = { id: "university", type: "university", status: "active" };
  memberships = new Map<string, string>([["admin", "university"]]);
  faculties: FacultyRecord[] = [];
  majors: MajorRecord[] = [];

  async findOrganization(id: string) {
    return id === this.organization.id ? this.organization : undefined;
  }
  async findActiveMembership(organizationId: string, userId: string) {
    return this.memberships.get(userId) === organizationId ? { role: "university_admin" } : undefined;
  }
  async listFaculties(organizationId: string) {
    return this.faculties.filter((item) => item.organizationId === organizationId);
  }
  async createFaculty(organizationId: string, name: string) {
    if (this.faculties.some((item) => item.organizationId === organizationId && item.name === name)) return undefined;
    const record = faculty({ organizationId, name });
    this.faculties.push(record);
    return record;
  }
  async findFaculty(id: string) {
    return this.faculties.find((item) => item.id === id);
  }
  async listMajors(facultyId: string) {
    return this.majors.filter((item) => item.facultyId === facultyId);
  }
  async createMajor(facultyId: string, name: string) {
    if (this.majors.some((item) => item.facultyId === facultyId && item.name === name)) return undefined;
    const record = major({ facultyId, name });
    this.majors.push(record);
    return record;
  }
}

function seededRepository() {
  return new MemoryAcademicRepository();
}

function faculty(overrides: Partial<FacultyRecord> = {}): FacultyRecord {
  return { id: "faculty", organizationId: "university", name: "คณะวิทยาศาสตร์", createdAt: new Date("2026-08-27"), ...overrides };
}

function major(overrides: Partial<MajorRecord> = {}): MajorRecord {
  return { id: "major", facultyId: "faculty", name: "วิทยาการคอมพิวเตอร์", createdAt: new Date("2026-08-27"), ...overrides };
}
