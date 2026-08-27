import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Database } from "../../db";
import type {
  MembershipRecord,
  OrganizationRecord,
} from "./organization.repository";

let database: Database;
let closeDatabase: () => Promise<void>;
let repository: import("./organization.repository").DrizzleOrganizationRepository;
let organization: OrganizationRecord;
let ownerMembership: MembershipRecord;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_DRIVER = "postgres";
  process.env.DATABASE_URL =
    "postgresql://trainy:trainy_test@localhost:5433/trainy_test";
  process.env.CORS_ORIGINS = "http://localhost:5173";
  process.env.BETTER_AUTH_SECRET =
    "test-secret-that-is-longer-than-thirty-two-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.LINE_CHANNEL_ID = "test-line-channel-id";
  process.env.LINE_CHANNEL_SECRET = "test-line-channel-secret";

  const databaseModule = await import("../../db");
  const schema = await import("../../db/schema");
  const repositoryModule = await import("./organization.repository");

  database = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;
  repository = new repositoryModule.DrizzleOrganizationRepository(database);

  await database.delete(schema.organizationMembership);
  await database.delete(schema.organization);
  await database.delete(schema.user);
  await database.insert(schema.user).values({
    id: "integration-owner",
    name: "Integration Owner",
    email: "owner@example.test",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  await closeDatabase();
});

describe("DrizzleOrganizationRepository", () => {
  it("creates an organization and its owner membership atomically", async () => {
    organization = await repository.createWithOwner({
      type: "university",
      name: "Integration University",
      slug: "integration-university",
      ownerUserId: "integration-owner",
      ownerRole: "university_admin",
    });

    ownerMembership = (await repository.findMembership(
      organization.id,
      "integration-owner",
    ))!;

    expect(organization.slug).toBe("integration-university");
    expect(ownerMembership).toMatchObject({
      role: "university_admin",
      status: "active",
    });
  });

  it("lists only organizations with an active membership", async () => {
    expect(await repository.listForUser("integration-owner")).toEqual([
      { organization, membership: ownerMembership },
    ]);

    await repository.updateMembership(ownerMembership.id, {
      status: "suspended",
    });

    expect(await repository.listForUser("integration-owner")).toHaveLength(0);
  });
});
