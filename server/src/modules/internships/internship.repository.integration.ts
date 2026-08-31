import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../../db";
import type { InternshipRecord } from "./internship.repository";

let database: Database;
let closeDatabase: () => Promise<void>;
let repository: import("./internship.repository").DrizzleInternshipRepository;
let internship: InternshipRecord;
let firstApplicationId: string;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_DRIVER = "postgres";
  process.env.DATABASE_URL = "postgresql://trainy:trainy_test@localhost:5433/trainy_test";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.BETTER_AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.LINE_CHANNEL_ID = "test-line-channel-id";
  process.env.LINE_CHANNEL_SECRET = "test-line-channel-secret";

  const databaseModule = await import("../../db");
  const schema = await import("../../db/schema");
  const repositoryModule = await import("./internship.repository");

  database = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;
  repository = new repositoryModule.DrizzleInternshipRepository(database);

  await database.delete(schema.internshipApplication);
  await database.delete(schema.internship);
  await database.delete(schema.onboardingRequest);
  await database.delete(schema.organizationMembership);
  await database.delete(schema.organization);
  await database.delete(schema.user);

  await database
    .insert(schema.user)
    .values([
      userRecord("company-admin", "company-admin@example.test"),
      userRecord("student", "student@example.test"),
      userRecord("student-two", "student-two@example.test"),
    ]);
  const [company, university] = await database
    .insert(schema.organization)
    .values([
      {
        name: "Integration Company",
        slug: "integration-company",
        type: "company",
      },
      {
        name: "Integration University",
        slug: "integration-university",
        type: "university",
      },
    ])
    .returning();
  if (!company || !university) throw new Error("Integration organizations were not created");

  await database.insert(schema.organizationMembership).values([
    {
      organizationId: company.id,
      userId: "company-admin",
      role: "company_admin",
    },
    { organizationId: university.id, userId: "student", role: "student" },
  ]);

  internship = await repository.createInternship({
    companyOrganizationId: company.id,
    createdByUserId: "company-admin",
    title: "Integration Internship",
    type: "regular",
    description: "An internship created by the repository integration test.",
    location: "Bangkok",
    workMode: "hybrid",
    capacity: 2,
    applicationDeadline: new Date("2030-01-01T00:00:00.000Z"),
  });
  await repository.updateInternship(internship.id, { status: "published" });
  internship.status = "published";

  const studentMembership = await repository.findMembership(university.id, "student");
  if (!studentMembership) throw new Error("Student membership was not created");
  Object.assign(integrationIds, { universityId: university.id });
});

afterAll(async () => {
  await closeDatabase();
});

const integrationIds = { universityId: "" };

describe("DrizzleInternshipRepository", () => {
  test("persists and lists a published internship", async () => {
    expect(await repository.listPublishedInternships()).toContainEqual(
      expect.objectContaining({ id: internship.id, status: "published" }),
    );
  });

  test("persists an application and scopes university queries", async () => {
    const application = await repository.createApplication({
      internshipId: internship.id,
      studentUserId: "student",
      universityOrganizationId: integrationIds.universityId,
      semester: 1,
      academicYear: 2569,
      statement: "I want to contribute and learn through this internship.",
    });
    if (!application) throw new Error("Integration application was not created");
    firstApplicationId = application.id;

    expect(await repository.listUniversityApplications(integrationIds.universityId)).toEqual([
      expect.objectContaining({
        id: application.id,
        studentUserId: "student",
        internship: expect.objectContaining({ title: "Integration Internship" }),
        student: { id: "student", name: "student", email: "student@example.test" },
        university: expect.objectContaining({
          id: integrationIds.universityId,
          type: "university",
        }),
      }),
    ]);
  });

  test("enforces one application per student and internship", async () => {
    expect(
      await repository.createApplication({
        internshipId: internship.id,
        studentUserId: "student",
        universityOrganizationId: integrationIds.universityId,
        semester: 1,
        academicYear: 2569,
        statement: "This duplicate must be rejected by the database.",
      }),
    ).toBeUndefined();
  });

  test("serializes concurrent acceptance so capacity cannot be exceeded", async () => {
    const second = await repository.createApplication({
      internshipId: internship.id,
      studentUserId: "student-two",
      universityOrganizationId: integrationIds.universityId,
      semester: 1,
      academicYear: 2569,
      statement: "I am the second candidate competing for the final place.",
    });
    if (!second) throw new Error("Second integration application was not created");

    const results = await Promise.all([
      repository.acceptApplicationWithinCapacity(firstApplicationId, internship.id, 1),
      repository.acceptApplicationWithinCapacity(second.id, internship.id, 1),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(
      (await repository.listInternshipApplications(internship.id)).filter(
        (application) => application.status === "accepted",
      ),
    ).toHaveLength(1);
  });
});

function userRecord(id: string, email: string) {
  return {
    id,
    name: id,
    email,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
