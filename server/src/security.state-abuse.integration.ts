// Authenticated round-2 security test: terminal-state and duplicate-action
// abuse. Same approach as security.authenticated-idor.test.ts — synthetic
// fixtures against the local ephemeral integration-test database
// (compose.yaml's postgres-test, port 5433), no real user data.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import type { Database } from "./db";

let db: Database;
let closeDatabase: () => Promise<void>;

const ids = {
  university: "77777777-7777-4777-8777-777777777777",
  company: "88888888-8888-4888-8888-888888888888",
  internship: "99999999-9999-4999-8999-999999999999",
  application: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  // Terminal (completed) placement — used only for the transition tests.
  placement: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  // A second, still-active placement — attendance/progress/documents/
  // evaluations all require an active placement, so the duplicate-action
  // tests for those need their own record separate from the terminal one.
  internshipActive: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  applicationActive: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  placementActive: "10101010-1010-4101-8101-101010101010",
  schedule: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  // Used only by the capacity-abuse test below.
  capacityInternship: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};
const users = {
  student: "sec-abuse-student",
  advisor: "sec-abuse-advisor",
  supervisor: "sec-abuse-supervisor",
  uniAdmin: "sec-abuse-uni-admin",
  // Used only by the capacity-abuse test below.
  secondApplicant: "sec-abuse-second-student",
  // Used only by the duplicate-onboarding test below.
  onboardingDuplicate: "sec-abuse-onboarding-user",
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
  // integration test files sharing the same ephemeral database.
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
    {
      id: ids.university,
      type: "university",
      name: "Abuse Test University",
      slug: "sec-abuse-university",
    },
    { id: ids.company, type: "company", name: "Abuse Test Company", slug: "sec-abuse-company" },
  ]);

  await db.insert(schema.organizationMembership).values([
    { organizationId: ids.university, userId: users.student, role: "student" },
    { organizationId: ids.university, userId: users.advisor, role: "advisor" },
    { organizationId: ids.university, userId: users.uniAdmin, role: "university_admin" },
    { organizationId: ids.company, userId: users.supervisor, role: "supervisor" },
  ]);

  await db.insert(schema.internship).values({
    id: ids.internship,
    companyOrganizationId: ids.company,
    createdByUserId: users.supervisor,
    title: "Abuse test internship",
    description: "Fixture only.",
    location: "Bangkok",
    workMode: "onsite",
    capacity: 1,
    applicationDeadline: new Date("2027-01-01"),
    status: "published",
  });

  await db.insert(schema.internshipApplication).values({
    id: ids.application,
    internshipId: ids.internship,
    studentUserId: users.student,
    universityOrganizationId: ids.university,
    semester: 1,
    academicYear: 2569,
    statement: "Abuse-test fixture application statement, long enough.",
    status: "accepted",
  });

  await db.insert(schema.placement).values({
    id: ids.placement,
    applicationId: ids.application,
    internshipId: ids.internship,
    studentUserId: users.student,
    universityOrganizationId: ids.university,
    companyOrganizationId: ids.company,
    track: "regular",
    semester: 1,
    academicYear: 2569,
    advisorUserId: users.advisor,
    supervisorUserId: users.supervisor,
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-12-31"),
    status: "completed",
  });

  await db.insert(schema.internship).values({
    id: ids.internshipActive,
    companyOrganizationId: ids.company,
    createdByUserId: users.supervisor,
    title: "Abuse test internship (active placement)",
    description: "Fixture only.",
    location: "Bangkok",
    workMode: "onsite",
    capacity: 1,
    applicationDeadline: new Date("2027-01-01"),
    status: "published",
  });

  await db.insert(schema.internshipApplication).values({
    id: ids.applicationActive,
    internshipId: ids.internshipActive,
    studentUserId: users.student,
    universityOrganizationId: ids.university,
    semester: 1,
    academicYear: 2569,
    statement: "Abuse-test fixture application statement, long enough.",
    status: "accepted",
  });

  await db.insert(schema.placement).values({
    id: ids.placementActive,
    applicationId: ids.applicationActive,
    internshipId: ids.internshipActive,
    studentUserId: users.student,
    universityOrganizationId: ids.university,
    companyOrganizationId: ids.company,
    track: "regular",
    semester: 1,
    academicYear: 2569,
    advisorUserId: users.advisor,
    supervisorUserId: users.supervisor,
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-12-31"),
    status: "active",
  });

  await db.insert(schema.placementWorkSchedule).values({
    id: ids.schedule,
    placementId: ids.placementActive,
    weekday: 1,
    startMinute: 480,
    endMinute: 1020,
    breakMinutes: 60,
    graceMinutes: 10,
    timezone: "Asia/Bangkok",
    locationPolicy: "disabled",
  });
});

afterAll(async () => {
  const schema = await import("./db/schema");
  await cleanup(schema);
  await closeDatabase();
});

async function cleanup(schema: Awaited<typeof import("./db/schema")>) {
  const placementIds = [ids.placement, ids.placementActive];
  const applicationIds = [ids.application, ids.applicationActive];
  const internshipIds = [ids.internship, ids.internshipActive, ids.capacityInternship];
  const orgIds = [ids.university, ids.company];
  const userIds = [...Object.values(users)];
  await db
    .delete(schema.placementEvaluation)
    .where(inArray(schema.placementEvaluation.placementId, placementIds));
  await db
    .delete(schema.placementDocument)
    .where(inArray(schema.placementDocument.placementId, placementIds));
  await db
    .delete(schema.progressReport)
    .where(inArray(schema.progressReport.placementId, placementIds));
  await db
    .delete(schema.attendanceAdjustmentRequest)
    .where(
      inArray(
        schema.attendanceAdjustmentRequest.attendanceId,
        db
          .select({ id: schema.attendanceRecord.id })
          .from(schema.attendanceRecord)
          .where(inArray(schema.attendanceRecord.placementId, placementIds)),
      ),
    );
  await db
    .delete(schema.attendanceRecord)
    .where(inArray(schema.attendanceRecord.placementId, placementIds));
  await db
    .delete(schema.placementWorkSchedule)
    .where(eq(schema.placementWorkSchedule.id, ids.schedule));
  await db.delete(schema.placement).where(inArray(schema.placement.id, placementIds));
  await db
    .delete(schema.internshipApplication)
    .where(inArray(schema.internshipApplication.id, applicationIds));
  // The two applications created ad hoc inside the capacity test don't have
  // fixed ids (they're DB-generated), so sweep by internship instead.
  await db
    .delete(schema.internshipApplication)
    .where(eq(schema.internshipApplication.internshipId, ids.capacityInternship));
  await db.delete(schema.internship).where(inArray(schema.internship.id, internshipIds));
  await db
    .delete(schema.onboardingRequest)
    .where(inArray(schema.onboardingRequest.userId, userIds));
  await db
    .delete(schema.organizationMembership)
    .where(inArray(schema.organizationMembership.organizationId, orgIds));
  await db.delete(schema.organization).where(inArray(schema.organization.id, orgIds));
  await db.delete(schema.user).where(inArray(schema.user.id, userIds));
}

describe("terminal-state abuse: a completed placement cannot be reopened or re-transitioned", () => {
  it("cannot move a completed placement back to active", async () => {
    const { PlacementService } = await import("./modules/placements/placement.service");
    const { DrizzlePlacementRepository } =
      await import("./modules/placements/placement.repository");
    const service = new PlacementService(new DrizzlePlacementRepository(db));
    await expect(
      service.updateStatus(users.uniAdmin, ids.placement, "active"),
    ).rejects.toMatchObject({ code: "INVALID_PLACEMENT_TRANSITION" });
  });

  it("cannot cancel an already-completed placement", async () => {
    const { PlacementService } = await import("./modules/placements/placement.service");
    const { DrizzlePlacementRepository } =
      await import("./modules/placements/placement.repository");
    const service = new PlacementService(new DrizzlePlacementRepository(db));
    await expect(
      service.updateStatus(users.uniAdmin, ids.placement, "cancelled"),
    ).rejects.toMatchObject({ code: "INVALID_PLACEMENT_TRANSITION" });
  });
});

describe("duplicate-action abuse: attendance", () => {
  it("a second check-in for the same day is rejected by the DB unique constraint, not silently duplicated", async () => {
    const { AttendanceService } = await import("./modules/attendance/attendance.service");
    const { DrizzleAttendanceRepository } =
      await import("./modules/attendance/attendance.repository");
    const now = new Date("2026-09-07T02:05:00.000Z"); // Monday, Asia/Bangkok
    const service = new AttendanceService(new DrizzleAttendanceRepository(db), () => now);
    const first = await service.checkIn(users.student, ids.placementActive, {});
    expect(first.status).toBe("checked_in");
    await expect(service.checkIn(users.student, ids.placementActive, {})).rejects.toMatchObject({
      code: "ATTENDANCE_ALREADY_EXISTS",
    });
  });

  it("a second pending adjustment request for the same attendance record is rejected", async () => {
    const { AttendanceService } = await import("./modules/attendance/attendance.service");
    const { DrizzleAttendanceRepository } =
      await import("./modules/attendance/attendance.repository");
    const schema = await import("./db/schema");
    const { eq } = await import("drizzle-orm");
    const record = await db.query.attendanceRecord.findFirst({
      where: eq(schema.attendanceRecord.placementId, ids.placementActive),
    });
    const service = new AttendanceService(new DrizzleAttendanceRepository(db));
    await service.requestAdjustment(users.student, record!.id, {
      reason: "First adjustment request, long enough reason.",
    });
    await expect(
      service.requestAdjustment(users.student, record!.id, {
        reason: "Second adjustment request while first still pending.",
      }),
    ).rejects.toMatchObject({ code: "ATTENDANCE_ADJUSTMENT_PENDING" });
  });
});

describe("duplicate-action abuse: documents", () => {
  it("a document that was already reviewed cannot be reviewed again (flip approved->rejected after the fact)", async () => {
    const { DrizzleDocumentRepository } = await import("./modules/documents/document.repository");
    const { DocumentService } = await import("./modules/documents/document.service");
    const schema = await import("./db/schema");
    const repository = new DrizzleDocumentRepository(db);
    const [document] = await db
      .insert(schema.placementDocument)
      .values({
        placementId: ids.placementActive,
        studentUserId: users.student,
        type: "consent",
        fileName: "consent.pdf",
        storageKey: "sec-abuse/fixture-consent.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      })
      .returning();
    const service = new DocumentService(repository);
    await service.review(users.advisor, document!.id, "approved");
    await expect(
      service.review(users.supervisor, document!.id, "rejected", "Trying to flip the decision."),
    ).rejects.toMatchObject({ code: "DOCUMENT_ALREADY_REVIEWED" });
  });
});

describe("duplicate-action abuse: evaluations", () => {
  it("a submitted evaluation cannot be submitted again, and becomes immutable to further save() calls", async () => {
    const { EvaluationService } = await import("./modules/evaluations/evaluation.service");
    const { DrizzleEvaluationRepository } =
      await import("./modules/evaluations/evaluation.repository");
    const service = new EvaluationService(new DrizzleEvaluationRepository(db));
    const draft = await service.save(users.advisor, ids.placementActive, {
      technicalScore: 4,
      communicationScore: 4,
      responsibilityScore: 4,
      comment: "Solid performance.",
    });
    const submitted = await service.submit(users.advisor, draft.id);
    expect(submitted.status).toBe("submitted");
    await expect(service.submit(users.advisor, draft.id)).rejects.toMatchObject({
      code: "EVALUATION_IMMUTABLE",
    });
    await expect(
      service.save(users.advisor, ids.placementActive, {
        technicalScore: 1,
        communicationScore: 1,
        responsibilityScore: 1,
        comment: "Trying to downgrade after submission.",
      }),
    ).rejects.toMatchObject({ code: "EVALUATION_IMMUTABLE" });
  });
});

describe("duplicate/invalid-state abuse: progress reports", () => {
  it("a submitted report's content cannot be edited", async () => {
    const { ProgressService } = await import("./modules/progress/progress.service");
    const { DrizzleProgressRepository } = await import("./modules/progress/progress.repository");
    const service = new ProgressService(new DrizzleProgressRepository(db));
    const draft = await service.create({
      actorUserId: users.student,
      placementId: ids.placementActive,
      periodStart: new Date("2026-09-01"),
      periodEnd: new Date("2026-09-07"),
      summary: "Week one activities, long enough to pass validation.",
      hoursWorked: 40,
    });
    await service.submit(users.student, draft!.id);
    await expect(
      service.update(users.student, draft!.id, {
        summary: "Trying to edit after submission, long enough text.",
      }),
    ).rejects.toMatchObject({ code: "PROGRESS_REPORT_IMMUTABLE" });
  });

  it("a draft (not-yet-submitted) report cannot be reviewed", async () => {
    const { ProgressService } = await import("./modules/progress/progress.service");
    const { DrizzleProgressRepository } = await import("./modules/progress/progress.repository");
    const service = new ProgressService(new DrizzleProgressRepository(db));
    const draft = await service.create({
      actorUserId: users.student,
      placementId: ids.placementActive,
      periodStart: new Date("2026-09-08"),
      periodEnd: new Date("2026-09-14"),
      summary: "Week two activities, long enough to pass validation.",
      hoursWorked: 40,
    });
    await expect(service.review(users.advisor, draft!.id, "approved")).rejects.toMatchObject({
      code: "INVALID_PROGRESS_TRANSITION",
    });
  });
});

describe("duplicate-action abuse: internship application acceptance beyond capacity", () => {
  it("cannot accept a second application once capacity (1) is already filled, even racing the row-locking transaction", async () => {
    const schema = await import("./db/schema");
    const { DrizzleInternshipRepository } =
      await import("./modules/internships/internship.repository");
    await db.insert(schema.internship).values({
      id: ids.capacityInternship,
      companyOrganizationId: ids.company,
      createdByUserId: users.supervisor,
      title: "Capacity abuse internship",
      description: "Fixture only.",
      location: "Bangkok",
      workMode: "onsite",
      capacity: 1,
      applicationDeadline: new Date("2027-01-01"),
      status: "published",
    });
    const [appOne] = await db
      .insert(schema.internshipApplication)
      .values({
        internshipId: ids.capacityInternship,
        studentUserId: users.student,
        universityOrganizationId: ids.university,
        semester: 1,
        academicYear: 2569,
        statement: "First applicant statement, long enough text.",
        status: "under_review",
      })
      .returning();
    const [appTwo] = await db
      .insert(schema.internshipApplication)
      .values({
        internshipId: ids.capacityInternship,
        studentUserId: users.secondApplicant,
        universityOrganizationId: ids.university,
        semester: 1,
        academicYear: 2569,
        statement: "Second applicant statement, long enough text.",
        status: "under_review",
      })
      .returning();
    const repository = new DrizzleInternshipRepository(db);
    const [firstResult, secondResult] = await Promise.all([
      repository.acceptApplicationWithinCapacity(appOne!.id, ids.capacityInternship, 1),
      repository.acceptApplicationWithinCapacity(appTwo!.id, ids.capacityInternship, 1),
    ]);
    const results = [firstResult, secondResult];
    expect(results.filter((r) => r?.status === "accepted")).toHaveLength(1);
    expect(results.filter((r) => r === undefined)).toHaveLength(1);
  });
});

describe("duplicate-action abuse: onboarding", () => {
  it("a second onboarding request cannot be created while one is already pending", async () => {
    const { OnboardingService } = await import("./modules/onboarding/onboarding.service");
    const { DrizzleOnboardingRepository } =
      await import("./modules/onboarding/onboarding.repository");
    const service = new OnboardingService(new DrizzleOnboardingRepository(db));
    await service.submit(users.onboardingDuplicate, {
      requestedRole: "advisor",
      targetOrganizationId: ids.university,
      profile: {
        fullName: "Duplicate Test",
        email: "dupe@example.test",
        phone: "0800000000",
        faculty: "Engineering",
        department: "CS",
        academicTitle: undefined,
        employeeId: undefined,
      },
    });
    await expect(
      service.submit(users.onboardingDuplicate, {
        requestedRole: "advisor",
        targetOrganizationId: ids.university,
        profile: {
          fullName: "Duplicate Test",
          email: "dupe@example.test",
          phone: "0800000000",
          faculty: "Engineering",
          department: "CS",
          academicTitle: undefined,
          employeeId: undefined,
        },
      }),
    ).rejects.toMatchObject({ code: "ONBOARDING_REQUEST_EXISTS" });
  });
});
