import { describe, expect, test } from "bun:test";
import type {
  AcademicOrganization,
  AcademicRecord,
  AcademicRepository,
  FacultyRecord,
  MajorRecord,
} from "./academic.repository";
import { AcademicService } from "./academic.service";

describe("AcademicService", () => {
  test("rejects listing faculties for a company organization", () => {
    const repository = seededRepository();
    repository.organization.type = "company";
    expect(new AcademicService(repository).listFaculties("university")).rejects.toMatchObject({
      code: "ACADEMIC_ORGANIZATION_NOT_FOUND",
    });
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
    const record = await new AcademicService(repository).createFaculty(
      "admin",
      "university",
      "คณะวิทยาศาสตร์",
    );
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
    expect(new AcademicService(repository).listMajors("missing")).rejects.toMatchObject({
      code: "ACADEMIC_FACULTY_NOT_FOUND",
    });
  });

  test("lets a university admin create a major under their faculty", async () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    const record = await new AcademicService(repository).createMajor(
      "admin",
      "faculty",
      "วิทยาการคอมพิวเตอร์",
    );
    expect(record).toMatchObject({ name: "วิทยาการคอมพิวเตอร์", facultyId: "faculty" });
  });

  test("rejects a major created by an admin of a different university", () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    repository.setMembership("other-admin", "outsider-org", "university_admin");
    expect(
      new AcademicService(repository).createMajor("other-admin", "faculty", "วิทยาการคอมพิวเตอร์"),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });

  test("lets a university admin assign a program chair who is an active advisor", async () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    repository.majors.push(major());
    repository.setMembership("advisor-1", "university", "advisor");
    const record = await new AcademicService(repository).setProgramChair(
      "admin",
      "major",
      "advisor-1",
    );
    expect(record.programChairUserId).toBe("advisor-1");
  });

  test("rejects assigning a program chair who is not an advisor", () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    repository.majors.push(major());
    repository.setMembership("student-1", "university", "student");
    expect(
      new AcademicService(repository).setProgramChair("admin", "major", "student-1"),
    ).rejects.toMatchObject({ code: "PROGRAM_CHAIR_MUST_BE_ADVISOR" });
  });

  test("rejects assigning a program chair without university admin access", () => {
    const repository = seededRepository();
    repository.faculties.push(faculty());
    repository.majors.push(major());
    repository.setMembership("advisor-1", "university", "advisor");
    expect(
      new AcademicService(repository).setProgramChair("outsider", "major", "advisor-1"),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });

  test("lets university staff set a student's academic record", async () => {
    const repository = seededRepository();
    repository.setMembership("student-1", "university", "student");
    const record = await new AcademicService(repository).setAcademicRecord(
      "admin",
      "university",
      "student-1",
      { cumulativeGpa: 3.2, lastTermGpa: 3.4, meetsPrerequisite: true },
    );
    expect(record).toMatchObject({ userId: "student-1", cumulativeGpa: "3.2" });
  });

  test("rejects setting an academic record for someone who isn't a student there", () => {
    const repository = seededRepository();
    repository.setMembership("advisor-1", "university", "advisor");
    expect(
      new AcademicService(repository).setAcademicRecord("admin", "university", "advisor-1", {
        cumulativeGpa: 3.2,
      }),
    ).rejects.toMatchObject({ code: "STUDENT_NOT_FOUND" });
  });
});

class MemoryAcademicRepository implements AcademicRepository {
  organization: AcademicOrganization = { id: "university", type: "university", status: "active" };
  memberships = new Map<string, { organizationId: string; role: string }>([
    ["admin", { organizationId: "university", role: "university_admin" }],
  ]);
  faculties: FacultyRecord[] = [];
  majors: MajorRecord[] = [];
  records = new Map<string, AcademicRecord>();

  setMembership(userId: string, organizationId: string, role: string) {
    this.memberships.set(userId, { organizationId, role });
  }

  async findOrganization(id: string) {
    return id === this.organization.id ? this.organization : undefined;
  }
  async findActiveMembership(organizationId: string, userId: string) {
    const membership = this.memberships.get(userId);
    return membership?.organizationId === organizationId ? { role: membership.role } : undefined;
  }
  async listFaculties(organizationId: string) {
    return this.faculties.filter((item) => item.organizationId === organizationId);
  }
  async createFaculty(organizationId: string, name: string) {
    if (this.faculties.some((item) => item.organizationId === organizationId && item.name === name))
      return undefined;
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
    if (this.majors.some((item) => item.facultyId === facultyId && item.name === name))
      return undefined;
    const record = major({ facultyId, name });
    this.majors.push(record);
    return record;
  }
  async findMajor(id: string) {
    return this.majors.find((item) => item.id === id);
  }
  async setProgramChair(majorId: string, userId: string) {
    const record = this.majors.find((item) => item.id === majorId);
    if (!record) throw new Error("Major was not found");
    record.programChairUserId = userId;
    return record;
  }
  async upsertAcademicRecord(input: Parameters<AcademicRepository["upsertAcademicRecord"]>[0]) {
    const record: AcademicRecord = {
      userId: input.userId,
      updatedByUserId: input.updatedByUserId,
      cumulativeGpa: input.cumulativeGpa?.toString() ?? null,
      lastTermGpa: input.lastTermGpa?.toString() ?? null,
      meetsPrerequisite: input.meetsPrerequisite ?? null,
      updatedAt: new Date("2026-08-27"),
    };
    this.records.set(input.userId, record);
    return record;
  }
}

function seededRepository() {
  return new MemoryAcademicRepository();
}

function faculty(overrides: Partial<FacultyRecord> = {}): FacultyRecord {
  return {
    id: "faculty",
    organizationId: "university",
    name: "คณะวิทยาศาสตร์",
    createdAt: new Date("2026-08-27"),
    ...overrides,
  };
}

function major(overrides: Partial<MajorRecord> = {}): MajorRecord {
  return {
    id: "major",
    facultyId: "faculty",
    name: "วิทยาการคอมพิวเตอร์",
    programChairUserId: null,
    createdAt: new Date("2026-08-27"),
    ...overrides,
  };
}
