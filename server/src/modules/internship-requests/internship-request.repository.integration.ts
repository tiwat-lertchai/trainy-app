import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import type { Database } from "../../db";

let database: Database;
let closeDatabase: () => Promise<void>;
let repository: import("./internship-request.repository").DrizzleInternshipRequestRepository;
let requestId: string;
const submissionKey = crypto.randomUUID();
const ids = { university: "", faculty: "", major: "" };

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
  const repositoryModule = await import("./internship-request.repository");
  database = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;
  repository = new repositoryModule.DrizzleInternshipRequestRepository(database);

  await database
    .insert(schema.user)
    .values([user("request-student"), user("request-advisor"), user("request-chair")]);
  const [university] = await database
    .insert(schema.organization)
    .values({
      type: "university",
      name: "Request Integration University",
      slug: "request-integration-university",
    })
    .returning();
  if (!university) throw new Error("University was not created");
  const [faculty] = await database
    .insert(schema.academicFaculty)
    .values({ organizationId: university.id, name: "Integration Faculty" })
    .returning();
  if (!faculty) throw new Error("Faculty was not created");
  const [major] = await database
    .insert(schema.academicMajor)
    .values({
      facultyId: faculty.id,
      name: "Integration Major",
      programChairUserId: "request-chair",
    })
    .returning();
  if (!major) throw new Error("Major was not created");
  Object.assign(ids, {
    university: university.id,
    faculty: faculty.id,
    major: major.id,
  });

  const created = await repository.create({
    request: {
      studentUserId: "request-student",
      universityOrganizationId: university.id,
      academicMajorId: major.id,
      type: "regular",
      semester: 1,
      academicYear: 2569,
      companyNameProposed: "Original Company",
      companyContactName: "Original Contact",
      companyContactEmail: "original@example.test",
      companyContactPhone: "0812345678",
      positionTitle: "Original Internship",
      description: "Original internship request description.",
      proposedStartDate: new Date("2027-01-01"),
      proposedEndDate: new Date("2027-04-01"),
      advisorUserId: "request-advisor",
    },
  });
  const submitted = await repository.submit({
    requestId: created.id,
    actorUserId: "request-student",
    idempotencyKey: submissionKey,
    maxActive: 2,
    reviewers: {
      advisor: "request-advisor",
      program_chair: "request-chair",
      center: null,
    },
  });
  requestId = submitted.id;
  await repository.decideStep({
    requestId,
    step: "advisor",
    reviewerUserId: "request-advisor",
    decision: "revision_requested",
    note: "Update the role and dates",
  });
});

afterAll(async () => {
  const schema = await import("../../db/schema");
  await database.delete(schema.internshipRequest).where(eq(schema.internshipRequest.id, requestId));
  await database.delete(schema.academicMajor).where(eq(schema.academicMajor.id, ids.major));
  await database.delete(schema.academicFaculty).where(eq(schema.academicFaculty.id, ids.faculty));
  await database.delete(schema.organization).where(eq(schema.organization.id, ids.university));
  await database
    .delete(schema.user)
    .where(inArray(schema.user.id, ["request-student", "request-advisor", "request-chair"]));
  await closeDatabase();
});

describe("DrizzleInternshipRequestRepository.resubmit", () => {
  test("replays an accepted submission key without duplicating approvals", async () => {
    const record = await repository.submit({
      requestId,
      actorUserId: "request-student",
      idempotencyKey: submissionKey,
      maxActive: 2,
      reviewers: {},
    });
    expect(record.submissionVersion).toBe(1);
    expect(record.approvals).toHaveLength(3);
  });

  test("updates editable values and resets approvals in one transaction", async () => {
    const record = await repository.resubmit(
      requestId,
      {
        positionTitle: "Revised Internship",
        description: "Revised internship request with corrected responsibilities.",
        proposedStartDate: new Date("2027-01-15"),
        proposedEndDate: new Date("2027-04-15"),
        companyNameProposed: "Revised Company",
        companyContactName: "Revised Contact",
        companyContactPosition: "HR Manager",
        companyContactEmail: "revised@example.test",
        companyContactPhone: "0898765432",
        companyAddress: "123 Integration Road, Bangkok",
      },
      {
        actorUserId: "request-student",
        idempotencyKey: crypto.randomUUID(),
        reviewers: {},
      },
    );

    expect(record).toMatchObject({
      status: "submitted",
      revisionNote: null,
      positionTitle: "Revised Internship",
      companyNameProposed: "Revised Company",
    });
    expect(record.approvals.every((approval) => approval.decision === "pending")).toBe(true);
    expect(record.approvals.find((approval) => approval.step === "advisor")?.reviewerUserId).toBe(
      "request-advisor",
    );
    expect(
      record.approvals.find((approval) => approval.step === "program_chair")?.reviewerUserId,
    ).toBe("request-chair");
    expect(
      record.approvals.find((approval) => approval.step === "center")?.reviewerUserId,
    ).toBeNull();
    expect(await repository.listActive()).toContainEqual(
      expect.objectContaining({
        id: requestId,
        student: {
          id: "request-student",
          name: "request-student",
          email: "request-student@example.test",
        },
      }),
    );
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
