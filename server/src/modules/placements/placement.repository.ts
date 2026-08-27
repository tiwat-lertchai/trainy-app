import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../../db";
import {
  internship,
  internshipApplication,
  organization,
  organizationMembership,
  placement,
} from "../../db/schema";
import type { PlacementStatus } from "./placement.schema";

export type PlacementRecord = typeof placement.$inferSelect;
export type AcceptedApplication = Pick<
  typeof internshipApplication.$inferSelect,
  | "id"
  | "internshipId"
  | "studentUserId"
  | "universityOrganizationId"
  | "status"
> & { companyOrganizationId: string };
export type PlacementMembership = {
  organizationId: string;
  organizationType: "university" | "company";
  role: typeof organizationMembership.$inferSelect.role;
  status: typeof organizationMembership.$inferSelect.status;
  userId: string;
};

export interface PlacementRepository {
  findApplication(id: string): Promise<AcceptedApplication | undefined>;
  findMembership(
    organizationId: string,
    userId: string,
  ): Promise<PlacementMembership | undefined>;
  findByApplication(
    applicationId: string,
  ): Promise<PlacementRecord | undefined>;
  findById(id: string): Promise<PlacementRecord | undefined>;
  create(input: {
    applicationId: string;
    internshipId: string;
    studentUserId: string;
    universityOrganizationId: string;
    companyOrganizationId: string;
    startDate: Date;
    endDate: Date;
  }): Promise<PlacementRecord | undefined>;
  update(
    id: string,
    changes: Partial<
      Pick<PlacementRecord, "advisorUserId" | "supervisorUserId" | "status">
    >,
  ): Promise<PlacementRecord>;
  listForStudent(userId: string): Promise<PlacementRecord[]>;
  listForOrganization(organizationId: string): Promise<PlacementRecord[]>;
}

export class DrizzlePlacementRepository implements PlacementRepository {
  constructor(private readonly database: Database) {}

  async findApplication(id: string) {
    const [record] = await this.database
      .select({
        id: internshipApplication.id,
        internshipId: internshipApplication.internshipId,
        studentUserId: internshipApplication.studentUserId,
        universityOrganizationId:
          internshipApplication.universityOrganizationId,
        status: internshipApplication.status,
        companyOrganizationId: internship.companyOrganizationId,
      })
      .from(internshipApplication)
      .innerJoin(
        internship,
        eq(internship.id, internshipApplication.internshipId),
      )
      .where(eq(internshipApplication.id, id))
      .limit(1);
    return record;
  }

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

  async findByApplication(applicationId: string) {
    return this.database.query.placement.findFirst({
      where: eq(placement.applicationId, applicationId),
    });
  }

  async findById(id: string) {
    return this.database.query.placement.findFirst({
      where: eq(placement.id, id),
    });
  }

  async create(input: Parameters<PlacementRepository["create"]>[0]) {
    const [record] = await this.database
      .insert(placement)
      .values(input)
      .onConflictDoNothing({ target: placement.applicationId })
      .returning();
    return record;
  }

  async update(
    id: string,
    changes: Parameters<PlacementRepository["update"]>[1],
  ) {
    const [record] = await this.database
      .update(placement)
      .set(changes)
      .where(eq(placement.id, id))
      .returning();
    if (!record)
      throw new Error("Database did not return the updated placement");
    return record;
  }

  async listForStudent(userId: string) {
    return this.database.query.placement.findMany({
      where: eq(placement.studentUserId, userId),
      orderBy: [desc(placement.createdAt)],
    });
  }

  async listForOrganization(organizationId: string) {
    return this.database.query.placement.findMany({
      where: (table, { or }) =>
        or(
          eq(table.universityOrganizationId, organizationId),
          eq(table.companyOrganizationId, organizationId),
        ),
      orderBy: [desc(placement.createdAt)],
    });
  }
}
