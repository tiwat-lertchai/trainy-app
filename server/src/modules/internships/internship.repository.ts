import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
  internship,
  internshipApplication,
  organization,
  organizationMembership,
} from "../../db/schema";
import type {
  ApplicationStatus,
  InternshipStatus,
  InternshipWorkMode,
} from "./internship.schema";

export type InternshipRecord = typeof internship.$inferSelect;
export type ApplicationRecord = typeof internshipApplication.$inferSelect;
export type ApplicationView = ApplicationRecord & {
  internship?: InternshipRecord;
  student?: { id: string; name: string; email: string };
  university?: { id: string; name: string; type: "university" | "company" };
};
export type MembershipAccess = Pick<
  typeof organizationMembership.$inferSelect,
  "organizationId" | "role" | "status" | "userId"
> & { organizationType: "university" | "company" };

type InternshipChanges = Partial<{
  title: string;
  description: string;
  location: string;
  workMode: InternshipWorkMode;
  capacity: number;
  applicationDeadline: Date;
  status: InternshipStatus;
}>;

export interface InternshipRepository {
  findMembership(
    organizationId: string,
    userId: string,
  ): Promise<MembershipAccess | undefined>;
  createInternship(input: {
    companyOrganizationId: string;
    createdByUserId: string;
    title: string;
    description: string;
    location: string;
    workMode: InternshipWorkMode;
    capacity: number;
    applicationDeadline: Date;
  }): Promise<InternshipRecord>;
  findInternship(id: string): Promise<InternshipRecord | undefined>;
  listPublishedInternships(): Promise<InternshipRecord[]>;
  listCompanyInternships(
    companyOrganizationId: string,
  ): Promise<InternshipRecord[]>;
  updateInternship(
    id: string,
    changes: InternshipChanges,
  ): Promise<InternshipRecord>;
  findApplication(
    internshipId: string,
    studentUserId: string,
  ): Promise<ApplicationRecord | undefined>;
  findApplicationById(id: string): Promise<ApplicationRecord | undefined>;
  createApplication(input: {
    internshipId: string;
    studentUserId: string;
    universityOrganizationId: string;
    statement: string;
  }): Promise<ApplicationRecord | undefined>;
  listStudentApplications(studentUserId: string): Promise<ApplicationView[]>;
  listInternshipApplications(
    internshipId: string,
  ): Promise<ApplicationView[]>;
  listUniversityApplications(
    universityOrganizationId: string,
  ): Promise<ApplicationView[]>;
  updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<ApplicationRecord>;
  acceptApplicationWithinCapacity(
    id: string,
    internshipId: string,
    capacity: number,
  ): Promise<ApplicationRecord | undefined>;
}

export class DrizzleInternshipRepository implements InternshipRepository {
  constructor(private readonly database: Database) {}

  async findMembership(organizationId: string, userId: string) {
    const [record] = await this.database
      .select({
        organizationId: organizationMembership.organizationId,
        organizationType: organization.type,
        role: organizationMembership.role,
        status: organizationMembership.status,
        userId: organizationMembership.userId,
      })
      .from(organizationMembership)
      .innerJoin(
        organization,
        eq(organization.id, organizationMembership.organizationId),
      )
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.userId, userId),
        ),
      )
      .limit(1);
    return record;
  }

  async createInternship(
    input: Parameters<InternshipRepository["createInternship"]>[0],
  ) {
    const [record] = await this.database
      .insert(internship)
      .values(input)
      .returning();
    return requireRecord(record, "created internship");
  }

  async findInternship(id: string) {
    return this.database.query.internship.findFirst({
      where: eq(internship.id, id),
    });
  }

  async listPublishedInternships() {
    return this.database.query.internship.findMany({
      where: eq(internship.status, "published"),
      orderBy: [desc(internship.createdAt)],
    });
  }

  async listCompanyInternships(companyOrganizationId: string) {
    return this.database.query.internship.findMany({
      where: eq(internship.companyOrganizationId, companyOrganizationId),
      orderBy: [desc(internship.createdAt)],
    });
  }

  async updateInternship(id: string, changes: InternshipChanges) {
    const [record] = await this.database
      .update(internship)
      .set(changes)
      .where(eq(internship.id, id))
      .returning();
    return requireRecord(record, "updated internship");
  }

  async findApplication(internshipId: string, studentUserId: string) {
    return this.database.query.internshipApplication.findFirst({
      where: and(
        eq(internshipApplication.internshipId, internshipId),
        eq(internshipApplication.studentUserId, studentUserId),
      ),
    });
  }

  async findApplicationById(id: string) {
    return this.database.query.internshipApplication.findFirst({
      where: eq(internshipApplication.id, id),
    });
  }

  async createApplication(
    input: Parameters<InternshipRepository["createApplication"]>[0],
  ) {
    const [record] = await this.database
      .insert(internshipApplication)
      .values(input)
      .onConflictDoNothing({
        target: [
          internshipApplication.internshipId,
          internshipApplication.studentUserId,
        ],
      })
      .returning();
    return record;
  }

  async listStudentApplications(studentUserId: string) {
    return this.database.query.internshipApplication.findMany({
      where: eq(internshipApplication.studentUserId, studentUserId),
      with: { internship: true, university: { columns: { id: true, name: true, type: true } } },
      orderBy: [desc(internshipApplication.submittedAt)],
    });
  }

  async listInternshipApplications(internshipId: string) {
    return this.database.query.internshipApplication.findMany({
      where: eq(internshipApplication.internshipId, internshipId),
      with: {
        internship: true,
        student: { columns: { id: true, name: true, email: true } },
        university: { columns: { id: true, name: true, type: true } },
      },
      orderBy: [desc(internshipApplication.submittedAt)],
    });
  }

  async listUniversityApplications(universityOrganizationId: string) {
    return this.database.query.internshipApplication.findMany({
      where: eq(
        internshipApplication.universityOrganizationId,
        universityOrganizationId,
      ),
      with: {
        internship: true,
        student: { columns: { id: true, name: true, email: true } },
        university: { columns: { id: true, name: true, type: true } },
      },
      orderBy: [desc(internshipApplication.submittedAt)],
    });
  }

  async updateApplicationStatus(id: string, status: ApplicationStatus) {
    const [record] = await this.database
      .update(internshipApplication)
      .set({ status })
      .where(eq(internshipApplication.id, id))
      .returning();
    return requireRecord(record, "updated application");
  }

  async acceptApplicationWithinCapacity(
    id: string,
    internshipId: string,
    capacity: number,
  ) {
    return this.database.transaction(async (transaction) => {
      // Lock the parent row so concurrent acceptance requests serialize before
      // checking capacity. A service-level count alone would have a race window.
      await transaction.execute(
        sql`select id from ${internship} where ${internship.id} = ${internshipId} for update`,
      );
      const [result] = await transaction
        .select({ count: sql<number>`count(*)::int` })
        .from(internshipApplication)
        .where(
          and(
            eq(internshipApplication.internshipId, internshipId),
            eq(internshipApplication.status, "accepted"),
          ),
        );
      if ((result?.count ?? 0) >= capacity) return undefined;

      const [record] = await transaction
        .update(internshipApplication)
        .set({ status: "accepted" })
        .where(eq(internshipApplication.id, id))
        .returning();
      return requireRecord(record, "accepted application");
    });
  }
}

function requireRecord<T>(record: T | undefined, operation: string): T {
  if (!record) throw new Error(`Database did not return the ${operation}`);
  return record;
}
