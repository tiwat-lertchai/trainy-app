import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../../db";

let database: Database;
let closeDatabase: () => Promise<void>;
let repository: import("./placement.repository").DrizzlePlacementRepository;
let progressRepository: import("../progress/progress.repository").DrizzleProgressRepository;
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
  const progressRepositoryModule =
    await import("../progress/progress.repository");
  database = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;
  repository = new repositoryModule.DrizzlePlacementRepository(database);
  progressRepository = new progressRepositoryModule.DrizzleProgressRepository(
    database,
  );

  await database.delete(schema.placement);
  await database.delete(schema.internshipApplication);
  await database.delete(schema.internship);
  await database.delete(schema.organizationMembership);
  await database.delete(schema.organization);
  await database.delete(schema.user);
  await database
    .insert(schema.user)
    .values([user("coordinator"), user("student"), user("company-admin")]);
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
  if (!company || !university)
    throw new Error("Organizations were not created");
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
      internshipId: (await repository.findApplication(ids.application))!
        .internshipId,
      studentUserId: "student",
      universityOrganizationId: ids.university,
      companyOrganizationId: ids.company,
      startDate: new Date("2027-01-01"),
      endDate: new Date("2027-04-01"),
    });
    expect(record).toBeDefined();
    placementId = record!.id;
    expect(await repository.listForOrganization(ids.university)).toHaveLength(
      1,
    );
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
