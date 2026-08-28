import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { academicFaculty, academicMajor, organization, organizationMembership } from "../../db/schema";

export type AcademicOrganization = Pick<typeof organization.$inferSelect, "id" | "type" | "status">;
export type FacultyRecord = typeof academicFaculty.$inferSelect;
export type MajorRecord = typeof academicMajor.$inferSelect;

export interface AcademicRepository {
  findOrganization(id: string): Promise<AcademicOrganization | undefined>;
  findActiveMembership(organizationId: string, userId: string): Promise<{ role: string } | undefined>;
  listFaculties(organizationId: string): Promise<FacultyRecord[]>;
  createFaculty(organizationId: string, name: string): Promise<FacultyRecord | undefined>;
  findFaculty(id: string): Promise<FacultyRecord | undefined>;
  listMajors(facultyId: string): Promise<MajorRecord[]>;
  createMajor(facultyId: string, name: string): Promise<MajorRecord | undefined>;
}

export class DrizzleAcademicRepository implements AcademicRepository {
  constructor(private readonly database: Database) {}

  async findOrganization(id: string) {
    const [record] = await this.database.select({ id: organization.id, type: organization.type, status: organization.status }).from(organization).where(eq(organization.id, id)).limit(1);
    return record;
  }

  async findActiveMembership(organizationId: string, userId: string) {
    const [record] = await this.database.select({ role: organizationMembership.role }).from(organizationMembership).where(and(eq(organizationMembership.organizationId, organizationId), eq(organizationMembership.userId, userId), eq(organizationMembership.status, "active"))).limit(1);
    return record;
  }

  listFaculties(organizationId: string) {
    return this.database.query.academicFaculty.findMany({ where: eq(academicFaculty.organizationId, organizationId), orderBy: [asc(academicFaculty.name)] });
  }

  async createFaculty(organizationId: string, name: string) {
    const [record] = await this.database.insert(academicFaculty).values({ organizationId, name }).onConflictDoNothing({ target: [academicFaculty.organizationId, academicFaculty.name] }).returning();
    return record;
  }

  findFaculty(id: string) {
    return this.database.query.academicFaculty.findFirst({ where: eq(academicFaculty.id, id) });
  }

  listMajors(facultyId: string) {
    return this.database.query.academicMajor.findMany({ where: eq(academicMajor.facultyId, facultyId), orderBy: [asc(academicMajor.name)] });
  }

  async createMajor(facultyId: string, name: string) {
    const [record] = await this.database.insert(academicMajor).values({ facultyId, name }).onConflictDoNothing({ target: [academicMajor.facultyId, academicMajor.name] }).returning();
    return record;
  }
}
