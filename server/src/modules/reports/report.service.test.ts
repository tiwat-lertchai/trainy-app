import { describe, expect, test } from "bun:test";
import type { ReportAccess, ReportRepository } from "./report.repository";
import { ReportService } from "./report.service";
describe("ReportService", () => {
  test("returns tenant-scoped aggregates to an active admin", async () => {
    const r = new MemoryReportRepository({
      organizationType: "company",
      role: "company_admin",
      status: "active",
    });
    expect(
      await new ReportService(r).organizationSummary("admin", "company"),
    ).toMatchObject({
      organizationType: "company",
      activeMembers: 3,
      internships: 2,
    });
  });
  test("rejects non-admin members", async () => {
    const r = new MemoryReportRepository({
      organizationType: "company",
      role: "supervisor",
      status: "active",
    });
    expect(
      new ReportService(r).organizationSummary("supervisor", "company"),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });
});
class MemoryReportRepository implements ReportRepository {
  constructor(private access: ReportAccess) {}
  async findAccess() {
    return this.access;
  }
  async countMembers() {
    return 3;
  }
  async countInternships() {
    return 2;
  }
  async applicationCounts() {
    return [{ status: "accepted", count: 1 }];
  }
  async placementCounts() {
    return [{ status: "active", count: 1 }];
  }
}
