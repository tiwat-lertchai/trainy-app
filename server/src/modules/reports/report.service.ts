import { AppError } from "../../lib/app-error";
import type { ReportRepository } from "./report.repository";
export class ReportService {
  constructor(private readonly repository: ReportRepository) {}
  async organizationSummary(actorUserId: string, organizationId: string) {
    const access = await this.repository.findAccess(organizationId, actorUserId);
    const adminRole =
      access?.organizationType === "university" ? "university_admin" : "company_admin";
    if (access?.status !== "active" || access.role !== adminRole)
      throw new AppError(
        "Organization administrator access is required",
        403,
        "ORGANIZATION_ADMIN_REQUIRED",
      );
    const [activeMembers, applications, placements, internships] = await Promise.all([
      this.repository.countMembers(organizationId),
      this.repository.applicationCounts(organizationId, access.organizationType),
      this.repository.placementCounts(organizationId, access.organizationType),
      access.organizationType === "company"
        ? this.repository.countInternships(organizationId)
        : Promise.resolve(undefined),
    ]);
    return {
      organizationId,
      organizationType: access.organizationType,
      activeMembers,
      internships,
      applications,
      placements,
    };
  }
}
