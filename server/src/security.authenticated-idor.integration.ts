// Authenticated round-2 security test: cross-tenant IDOR and role escalation.
//
// Runs against the local ephemeral integration-test database
// (compose.yaml's postgres-test, tmpfs, port 5433) with fully synthetic
// fixtures — no real user data, no real memberships, no migration against
// a shared environment. This exercises the same actorUserId-scoped
// authorization logic a real authenticated session would hit, without
// needing Better Auth/LINE OAuth sessions: every service method already
// takes actorUserId as an explicit parameter decoupled from the HTTP layer.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import type { Database } from "./db";

let db: Database;
let closeDatabase: () => Promise<void>;

// Two fully separate tenants (university-a/company-a vs university-b) so
// cross-tenant access attempts are unambiguous.
const ids = {
  universityA: "11111111-1111-4111-8111-111111111111",
  universityB: "22222222-2222-4222-8222-222222222222",
  companyA: "33333333-3333-4333-8333-333333333333",
  internshipA: "44444444-4444-4444-8444-444444444444",
  applicationA: "55555555-5555-4555-8555-555555555555",
  placementA: "66666666-6666-4666-8666-666666666666",
};
const users = {
  studentA: "sec-idor-student-a",
  advisorA: "sec-idor-advisor-a",
  supervisorA: "sec-idor-supervisor-a",
  uniAAdmin: "sec-idor-uniA-admin",
  coordinatorA: "sec-idor-coordinator-a",
  // Belongs to a completely different university; has zero relationship to
  // placement A. This is the "attacker" identity for every IDOR check below.
  studentB: "sec-idor-student-b",
  uniBAdmin: "sec-idor-uniB-admin",
};

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_DRIVER = "postgres";
  process.env.DATABASE_URL = "postgresql://trainy:trainy_test@localhost:5433/trainy_test";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.BETTER_AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.LINE_CHANNEL_ID = "test-line-channel-id";
  process.env.LINE_CHANNEL_SECRET = "test-line-channel-secret";

  const databaseModule = await import("./db");
  const schema = await import("./db/schema");
  db = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;

  // Scoped to exactly this file's fixture ids — never a table-wide delete —
  // so this can safely run before, after, or interleaved with the other
  // integration test files sharing the same ephemeral database, regardless
  // of what fixtures they leave behind.
  await cleanup(schema);

  await db.insert(schema.user).values(
    Object.values(users).map((id) => ({
      id,
      name: id,
      email: `${id}@example.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

  await db.insert(schema.organization).values([
    { id: ids.universityA, type: "university", name: "University A", slug: "sec-university-a" },
    { id: ids.universityB, type: "university", name: "University B", slug: "sec-university-b" },
    { id: ids.companyA, type: "company", name: "Company A", slug: "sec-company-a" },
  ]);

  await db.insert(schema.organizationMembership).values([
    { organizationId: ids.universityA, userId: users.studentA, role: "student" },
    { organizationId: ids.universityA, userId: users.advisorA, role: "advisor" },
    { organizationId: ids.universityA, userId: users.uniAAdmin, role: "university_admin" },
    { organizationId: ids.universityA, userId: users.coordinatorA, role: "coordinator" },
    { organizationId: ids.companyA, userId: users.supervisorA, role: "supervisor" },
    { organizationId: ids.universityB, userId: users.studentB, role: "student" },
    { organizationId: ids.universityB, userId: users.uniBAdmin, role: "university_admin" },
  ]);

  await db.insert(schema.internship).values({
    id: ids.internshipA,
    companyOrganizationId: ids.companyA,
    createdByUserId: users.supervisorA,
    title: "Security test internship",
    description: "Fixture only.",
    location: "Bangkok",
    workMode: "onsite",
    capacity: 1,
    applicationDeadline: new Date("2027-01-01"),
    status: "published",
  });

  await db.insert(schema.internshipApplication).values({
    id: ids.applicationA,
    internshipId: ids.internshipA,
    studentUserId: users.studentA,
    universityOrganizationId: ids.universityA,
    statement: "Security fixture application statement, long enough.",
    status: "accepted",
  });

  await db.insert(schema.placement).values({
    id: ids.placementA,
    applicationId: ids.applicationA,
    internshipId: ids.internshipA,
    studentUserId: users.studentA,
    universityOrganizationId: ids.universityA,
    companyOrganizationId: ids.companyA,
    advisorUserId: users.advisorA,
    supervisorUserId: users.supervisorA,
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-12-31"),
    status: "active",
  });
});

afterAll(async () => {
  const schema = await import("./db/schema");
  await cleanup(schema);
  await closeDatabase();
});

async function cleanup(schema: Awaited<typeof import("./db/schema")>) {
  const orgIds = [ids.universityA, ids.universityB, ids.companyA];
  const userIds = Object.values(users);
  await db
    .delete(schema.placementEvaluation)
    .where(eq(schema.placementEvaluation.placementId, ids.placementA));
  await db
    .delete(schema.placementDocument)
    .where(eq(schema.placementDocument.placementId, ids.placementA));
  await db
    .delete(schema.progressReport)
    .where(eq(schema.progressReport.placementId, ids.placementA));
  await db
    .delete(schema.attendanceAdjustmentRequest)
    .where(
      inArray(
        schema.attendanceAdjustmentRequest.attendanceId,
        db
          .select({ id: schema.attendanceRecord.id })
          .from(schema.attendanceRecord)
          .where(eq(schema.attendanceRecord.placementId, ids.placementA)),
      ),
    );
  await db
    .delete(schema.attendanceRecord)
    .where(eq(schema.attendanceRecord.placementId, ids.placementA));
  await db
    .delete(schema.placementWorkSchedule)
    .where(eq(schema.placementWorkSchedule.placementId, ids.placementA));
  await db.delete(schema.placement).where(eq(schema.placement.id, ids.placementA));
  await db
    .delete(schema.internshipApplication)
    .where(eq(schema.internshipApplication.id, ids.applicationA));
  await db.delete(schema.internship).where(eq(schema.internship.id, ids.internshipA));
  await db
    .delete(schema.onboardingRequest)
    .where(inArray(schema.onboardingRequest.userId, userIds));
  await db
    .delete(schema.organizationMembership)
    .where(inArray(schema.organizationMembership.organizationId, orgIds));
  await db.delete(schema.organization).where(inArray(schema.organization.id, orgIds));
  await db.delete(schema.user).where(inArray(schema.user.id, userIds));
}

describe("cross-tenant IDOR: an outsider (student B, unrelated university) against placement A", () => {
  it("cannot list placement A's attendance", async () => {
    const { AttendanceService } = await import("./modules/attendance/attendance.service");
    const { DrizzleAttendanceRepository } =
      await import("./modules/attendance/attendance.repository");
    const service = new AttendanceService(new DrizzleAttendanceRepository(db));
    await expect(service.list(users.studentB, ids.placementA)).rejects.toMatchObject({
      code: "PLACEMENT_ACCESS_REQUIRED",
    });
  });

  it("cannot check in against placement A (privacy-preserving 404, not a leaky 403)", async () => {
    const { AttendanceService } = await import("./modules/attendance/attendance.service");
    const { DrizzleAttendanceRepository } =
      await import("./modules/attendance/attendance.repository");
    const service = new AttendanceService(new DrizzleAttendanceRepository(db));
    await expect(service.checkIn(users.studentB, ids.placementA, {})).rejects.toMatchObject({
      code: "ATTENDANCE_NOT_FOUND",
    });
  });

  it("cannot list placement A's progress reports", async () => {
    const { ProgressService } = await import("./modules/progress/progress.service");
    const { DrizzleProgressRepository } = await import("./modules/progress/progress.repository");
    const service = new ProgressService(new DrizzleProgressRepository(db));
    await expect(service.list(users.studentB, ids.placementA)).rejects.toMatchObject({
      code: "PLACEMENT_ACCESS_REQUIRED",
    });
  });

  it("cannot create a progress report against placement A (privacy-preserving 404)", async () => {
    const { ProgressService } = await import("./modules/progress/progress.service");
    const { DrizzleProgressRepository } = await import("./modules/progress/progress.repository");
    const service = new ProgressService(new DrizzleProgressRepository(db));
    await expect(
      service.create({
        actorUserId: users.studentB,
        placementId: ids.placementA,
        periodStart: new Date("2026-10-01"),
        periodEnd: new Date("2026-10-07"),
        summary: "Attempted cross-tenant write, long enough text.",
        hoursWorked: 40,
      }),
    ).rejects.toMatchObject({ code: "PROGRESS_REPORT_NOT_FOUND" });
  });

  it("cannot list placement A's documents", async () => {
    const { DocumentService } = await import("./modules/documents/document.service");
    const { DrizzleDocumentRepository } = await import("./modules/documents/document.repository");
    const service = new DocumentService(new DrizzleDocumentRepository(db));
    await expect(service.list(users.studentB, ids.placementA)).rejects.toMatchObject({
      code: "PLACEMENT_ACCESS_REQUIRED",
    });
  });

  it("cannot download a document that belongs to placement A", async () => {
    const { DrizzleDocumentRepository } = await import("./modules/documents/document.repository");
    const { DocumentService } = await import("./modules/documents/document.service");
    const repository = new DrizzleDocumentRepository(db);
    const [document] = await db
      .insert((await import("./db/schema")).placementDocument)
      .values({
        placementId: ids.placementA,
        studentUserId: users.studentA,
        type: "consent",
        fileName: "consent.pdf",
        storageKey: "sec-idor/fixture-consent.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      })
      .returning();
    const service = new DocumentService(repository);
    await expect(service.download(users.studentB, document!.id)).rejects.toMatchObject({
      code: "PLACEMENT_ACCESS_REQUIRED",
    });
  });

  it("cannot list placement A's evaluations", async () => {
    const { EvaluationService } = await import("./modules/evaluations/evaluation.service");
    const { DrizzleEvaluationRepository } =
      await import("./modules/evaluations/evaluation.repository");
    const service = new EvaluationService(new DrizzleEvaluationRepository(db));
    await expect(service.list(users.studentB, ids.placementA)).rejects.toMatchObject({
      code: "PLACEMENT_ACCESS_REQUIRED",
    });
  });

  it("cannot list university A's placements without membership there", async () => {
    const { PlacementService } = await import("./modules/placements/placement.service");
    const { DrizzlePlacementRepository } =
      await import("./modules/placements/placement.repository");
    const service = new PlacementService(new DrizzlePlacementRepository(db));
    await expect(
      service.listOrganizationPlacements(users.studentB, ids.universityA),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
  });

  it("cannot read university A's organization report/summary", async () => {
    const { ReportService } = await import("./modules/reports/report.service");
    const { DrizzleReportRepository } = await import("./modules/reports/report.repository");
    const service = new ReportService(new DrizzleReportRepository(db));
    await expect(
      service.organizationSummary(users.studentB, ids.universityA),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });

  it("an admin of university B cannot read university A's report either (tenant boundary, not just role check)", async () => {
    const { ReportService } = await import("./modules/reports/report.service");
    const { DrizzleReportRepository } = await import("./modules/reports/report.repository");
    const service = new ReportService(new DrizzleReportRepository(db));
    await expect(
      service.organizationSummary(users.uniBAdmin, ids.universityA),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });
});

describe("role escalation: a legitimate participant of placement A acting outside their role", () => {
  it("the student cannot review their own submitted document (advisor/supervisor-only action)", async () => {
    const { DrizzleDocumentRepository } = await import("./modules/documents/document.repository");
    const { DocumentService } = await import("./modules/documents/document.service");
    const repository = new DrizzleDocumentRepository(db);
    const [document] = await db
      .insert((await import("./db/schema")).placementDocument)
      .values({
        placementId: ids.placementA,
        studentUserId: users.studentA,
        type: "resume",
        fileName: "resume.pdf",
        storageKey: "sec-idor/fixture-resume.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      })
      .returning();
    const service = new DocumentService(repository);
    await expect(service.review(users.studentA, document!.id, "approved")).rejects.toMatchObject({
      code: "DOCUMENT_REVIEWER_REQUIRED",
    });
  });

  it("the student cannot score their own evaluation (advisor/supervisor-only action)", async () => {
    const { EvaluationService } = await import("./modules/evaluations/evaluation.service");
    const { DrizzleEvaluationRepository } =
      await import("./modules/evaluations/evaluation.repository");
    const service = new EvaluationService(new DrizzleEvaluationRepository(db));
    await expect(
      service.save(users.studentA, ids.placementA, {
        technicalScore: 5,
        communicationScore: 5,
        responsibilityScore: 5,
        comment: "Self-scoring attempt.",
      }),
    ).rejects.toMatchObject({ code: "EVALUATOR_REQUIRED" });
  });

  it("an advisor cannot set the company work schedule (company_admin-only action)", async () => {
    const { AttendanceService } = await import("./modules/attendance/attendance.service");
    const { DrizzleAttendanceRepository } =
      await import("./modules/attendance/attendance.repository");
    const service = new AttendanceService(new DrizzleAttendanceRepository(db));
    await expect(
      service.saveSchedule(users.advisorA, ids.placementA, {
        days: [
          { weekday: 1, startMinute: 480, endMinute: 1020, breakMinutes: 60, graceMinutes: 10 },
        ],
        timezone: "Asia/Bangkok",
        locationPolicy: "disabled",
      }),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
  });

  it("a coordinator cannot create academic faculties (university_admin-only, not any university staff)", async () => {
    const { AcademicService } = await import("./modules/academic/academic.service");
    const { DrizzleAcademicRepository } = await import("./modules/academic/academic.repository");
    const service = new AcademicService(new DrizzleAcademicRepository(db));
    await expect(
      service.createFaculty(users.coordinatorA, ids.universityA, "Escalation attempt faculty"),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ADMIN_REQUIRED" });
  });

  it("a student cannot use the organization-wide placement listing endpoint, even for their own university", async () => {
    const { PlacementService } = await import("./modules/placements/placement.service");
    const { DrizzlePlacementRepository } =
      await import("./modules/placements/placement.repository");
    const service = new PlacementService(new DrizzlePlacementRepository(db));
    await expect(
      service.listOrganizationPlacements(users.studentA, ids.universityA),
    ).rejects.toMatchObject({ code: "ORGANIZATION_ACCESS_REQUIRED" });
  });
});
