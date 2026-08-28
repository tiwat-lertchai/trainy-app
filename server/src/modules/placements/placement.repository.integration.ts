import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../../db";

let database: Database;
let closeDatabase: () => Promise<void>;
let repository: import("./placement.repository").DrizzlePlacementRepository;
let progressRepository: import("../progress/progress.repository").DrizzleProgressRepository;
let documentRepository: import("../documents/document.repository").DrizzleDocumentRepository;
let evaluationRepository: import("../evaluations/evaluation.repository").DrizzleEvaluationRepository;
let notificationRepository: import("../notifications/notification.repository").DrizzleNotificationRepository;
let reportRepository: import("../reports/report.repository").DrizzleReportRepository;
let placementId: string;
const ids = { application: "", company: "", university: "" };

beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_DRIVER: "postgres",
    DATABASE_URL: "postgresql://trainy:trainy_test@localhost:5433/trainy_test",
    CORS_ORIGINS: "http://localhost:5173",
    BETTER_AUTH_SECRET: "test-secret-that-is-longer-than-thirty-two-characters",
    BETTER_AUTH_URL: "http://localhost:3000",
    LINE_CHANNEL_ID: "test-line-channel-id",
    LINE_CHANNEL_SECRET: "test-line-channel-secret",
  });
  const databaseModule = await import("../../db");
  const schema = await import("../../db/schema");
  const repositoryModule = await import("./placement.repository");
  const progressRepositoryModule = await import("../progress/progress.repository");
  const documentRepositoryModule = await import("../documents/document.repository");
  const evaluationRepositoryModule = await import("../evaluations/evaluation.repository");
  const notificationRepositoryModule = await import("../notifications/notification.repository");
  const reportRepositoryModule = await import("../reports/report.repository");
  database = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;
  repository = new repositoryModule.DrizzlePlacementRepository(database);
  progressRepository = new progressRepositoryModule.DrizzleProgressRepository(database);
  documentRepository = new documentRepositoryModule.DrizzleDocumentRepository(database);
  evaluationRepository = new evaluationRepositoryModule.DrizzleEvaluationRepository(database);
  notificationRepository = new notificationRepositoryModule.DrizzleNotificationRepository(database);
  reportRepository = new reportRepositoryModule.DrizzleReportRepository(database);

  await database.delete(schema.placement);
  await database.delete(schema.internshipApplication);
  await database.delete(schema.internship);
  await database.delete(schema.onboardingRequest);
  await database.delete(schema.organizationMembership);
  await database.delete(schema.organization);
  await database.delete(schema.user);
  await database
    .insert(schema.user)
    .values([
      user("coordinator"),
      user("student"),
      user("company-admin"),
      user("advisor"),
      user("supervisor"),
    ]);
  const [company, university] = await database
    .insert(schema.organization)
    .values([
      { type: "company", name: "Placement Company", slug: "placement-company" },
      {
        type: "university",
        name: "Placement University",
        slug: "placement-university",
      },
    ])
    .returning();
  if (!company || !university) throw new Error("Organizations were not created");
  await database.insert(schema.organizationMembership).values([
    {
      organizationId: university.id,
      userId: "coordinator",
      role: "university_admin",
    },
    {
      organizationId: company.id,
      userId: "company-admin",
      role: "company_admin",
    },
  ]);
  const [internship] = await database
    .insert(schema.internship)
    .values({
      companyOrganizationId: company.id,
      createdByUserId: "company-admin",
      title: "Placement Internship",
      description: "An accepted internship application for placement testing.",
      location: "Bangkok",
      workMode: "onsite",
      capacity: 1,
      applicationDeadline: new Date("2030-01-01"),
      status: "published",
    })
    .returning();
  if (!internship) throw new Error("Internship was not created");
  const [application] = await database
    .insert(schema.internshipApplication)
    .values({
      internshipId: internship.id,
      studentUserId: "student",
      universityOrganizationId: university.id,
      statement: "Accepted application for placement integration testing.",
      status: "accepted",
    })
    .returning();
  if (!application) throw new Error("Application was not created");
  Object.assign(ids, {
    application: application.id,
    company: company.id,
    university: university.id,
  });
});

afterAll(async () => closeDatabase());

describe("DrizzlePlacementRepository", () => {
  test("creates one placement and scopes organization listing", async () => {
    const record = await repository.create({
      applicationId: ids.application,
      internshipId: (await repository.findApplication(ids.application))!.internshipId,
      studentUserId: "student",
      universityOrganizationId: ids.university,
      companyOrganizationId: ids.company,
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-04-01"),
    });
    expect(record).toBeDefined();
    placementId = record!.id;
    expect(await repository.listForOrganization(ids.university)).toHaveLength(1);
    expect(await repository.listForOrganization(ids.company)).toHaveLength(1);
  });

  test("enforces one progress report per placement period", async () => {
    const input = {
      placementId,
      studentUserId: "student",
      periodStart: new Date("2027-01-01"),
      periodEnd: new Date("2027-01-07"),
      summary: "Completed the first integration test reporting period.",
      hoursWorked: 40,
    };
    expect(await progressRepository.create(input)).toBeDefined();
    expect(await progressRepository.create(input)).toBeUndefined();
  });

  test("returns no record for a duplicate application placement", async () => {
    const source = (await repository.findApplication(ids.application))!;
    expect(
      await repository.create({
        applicationId: ids.application,
        internshipId: source.internshipId,
        studentUserId: "student",
        universityOrganizationId: ids.university,
        companyOrganizationId: ids.company,
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-04-01"),
      }),
    ).toBeUndefined();
  });

  test("persists document metadata and one evaluation per evaluator type", async () => {
    expect(
      await documentRepository.create({
        placementId,
        studentUserId: "student",
        type: "consent",
        fileName: "consent.pdf",
        storageKey: "placements/integration/consent.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      }),
    ).toMatchObject({ status: "submitted" });

    const evaluationInput = {
      placementId,
      evaluatorUserId: "advisor",
      evaluatorType: "advisor" as const,
      technicalScore: 4,
      communicationScore: 5,
      responsibilityScore: 4,
      comment: "Strong integration evaluation performance.",
    };
    expect(await evaluationRepository.create(evaluationInput)).toBeDefined();
    expect(evaluationRepository.create(evaluationInput)).rejects.toBeDefined();
  });

  test("scopes notifications and computes tenant report aggregates", async () => {
    const notification = await notificationRepository.create({
      userId: "student",
      type: "placement",
      title: "Placement updated",
      message: "Your placement workflow changed.",
      entityType: "placement",
      entityId: placementId,
    });
    expect(await notificationRepository.list("student")).toHaveLength(1);
    expect(
      await notificationRepository.markRead(notification.id, "company-admin", new Date()),
    ).toBeUndefined();
    expect(await reportRepository.countInternships(ids.company)).toBe(1);
    expect(await reportRepository.placementCounts(ids.university, "university")).toHaveLength(1);
  });

  test("persists append-only audit events", async () => {
    const schema = await import("../../db/schema");
    const [event] = await database
      .insert(schema.auditEvent)
      .values({
        actorUserId: "company-admin",
        organizationId: ids.company,
        action: "PATCH /api/v1/placements/test/status",
        entityType: "placements",
        entityId: placementId,
        requestId: "integration-request",
        metadata: { status: 200 },
      })
      .returning();
    expect(event?.action).toStartWith("PATCH");
  });
});

function user(id: string) {
  return {
    id,
    name: id,
    email: `${id}@example.test`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
