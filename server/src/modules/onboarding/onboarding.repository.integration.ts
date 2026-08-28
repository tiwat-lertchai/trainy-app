import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Database } from "../../db";
import type { OnboardingRepository } from "./onboarding.repository";

let database: Database;
let closeDatabase: () => Promise<void>;
let repository: OnboardingRepository;

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
  const repositoryModule = await import("./onboarding.repository");
  database = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;
  repository = new repositoryModule.DrizzleOnboardingRepository(database);
  await database.delete(schema.onboardingRequest);
  await database.delete(schema.platformStaff);
  await database.delete(schema.organizationMembership);
  await database.delete(schema.organization);
  await database.delete(schema.user);
  const users = ["student", "company-admin", "cwie"].map((id) => ({ id, name: id, email: `${id}@example.test`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() }));
  await database.insert(schema.user).values(users);
  await database.insert(schema.platformStaff).values({ userId: "cwie" });
});

afterAll(async () => closeDatabase());

describe("DrizzleOnboardingRepository", () => {
  it("atomically approves a student and creates university membership", async () => {
    const schema = await import("../../db/schema");
    const [university] = await database.insert(schema.organization).values({ type: "university", name: "Test University", slug: "test-university" }).returning();
    const result = await repository.createApprovedStudent({ userId: "student", requestedRole: "student", targetOrganizationId: university!.id, profileData: { studentId: "65001" } });
    expect(result.status).toBe("approved");
    expect(await repository.findActiveMembership(university!.id, "student")).toMatchObject({ role: "student" });
  });

  it("lets CWIE approve a verified company request atomically", async () => {
    const pending = await repository.createPending({ userId: "company-admin", requestedRole: "company_admin", profileData: { jobTitle: "Manager" }, proposedOrganization: { name: "Verified Company", slug: "verified-company", registrationNumber: "0101" } });
    expect(await repository.isPlatformStaff("cwie")).toBeTrue();
    const approved = await repository.approve({ request: pending, reviewerUserId: "cwie", note: "Documents verified" });
    expect(approved).toMatchObject({ status: "approved", reviewerUserId: "cwie" });
    expect(await repository.findActiveMembership(approved.targetOrganizationId!, "company-admin")).toMatchObject({ role: "company_admin" });
  });
});
