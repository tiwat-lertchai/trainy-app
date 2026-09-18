import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import {
  accessRole,
  internship,
  internshipApplication,
  organization,
  organizationMembership,
  membershipRoleAssignment,
  placement,
} from "../../db/schema";
export type ReportAccess = {
  organizationType: "university" | "company";
  role: string;
  status: typeof organizationMembership.$inferSelect.status;
};
export type StatusCount = { status: string; count: number };
export interface ReportRepository {
  findAccess(organizationId: string, userId: string): Promise<ReportAccess | undefined>;
  countMembers(organizationId: string): Promise<number>;
  countInternships(companyId: string): Promise<number>;
  applicationCounts(organizationId: string, type: "university" | "company"): Promise<StatusCount[]>;
  placementCounts(organizationId: string, type: "university" | "company"): Promise<StatusCount[]>;
}
export class DrizzleReportRepository implements ReportRepository {
  constructor(private readonly database: Database) {}
  async findAccess(organizationId: string, userId: string) {
    const [r] = await this.database
      .select({
        organizationType: organization.type,
        role: accessRole.key,
        status: organizationMembership.status,
      })
      .from(organizationMembership)
      .innerJoin(
        membershipRoleAssignment,
        and(
          eq(membershipRoleAssignment.membershipId, organizationMembership.id),
          eq(membershipRoleAssignment.isPrimary, true),
        ),
      )
      .innerJoin(accessRole, eq(accessRole.id, membershipRoleAssignment.roleId))
      .innerJoin(organization, eq(organization.id, organizationMembership.organizationId))
      .where(
        and(
          eq(organizationMembership.organizationId, organizationId),
          eq(organizationMembership.userId, userId),
        ),
      )
      .limit(1);
    return r;
  }
  async countMembers(id: string) {
    const [r] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembership)
      .where(
        and(
          eq(organizationMembership.organizationId, id),
          eq(organizationMembership.status, "active"),
        ),
      );
    return r?.count ?? 0;
  }
  async countInternships(id: string) {
    const [r] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(internship)
      .where(eq(internship.companyOrganizationId, id));
    return r?.count ?? 0;
  }
  applicationCounts(id: string, type: "university" | "company") {
    const base = this.database
      .select({
        status: internshipApplication.status,
        count: sql<number>`count(*)::int`,
      })
      .from(internshipApplication);
    return type === "university"
      ? base
          .where(eq(internshipApplication.universityOrganizationId, id))
          .groupBy(internshipApplication.status)
      : base
          .innerJoin(internship, eq(internship.id, internshipApplication.internshipId))
          .where(eq(internship.companyOrganizationId, id))
          .groupBy(internshipApplication.status);
  }
  placementCounts(id: string, type: "university" | "company") {
    const column =
      type === "university" ? placement.universityOrganizationId : placement.companyOrganizationId;
    return this.database
      .select({ status: placement.status, count: sql<number>`count(*)::int` })
      .from(placement)
      .where(eq(column, id))
      .groupBy(placement.status);
  }
}
