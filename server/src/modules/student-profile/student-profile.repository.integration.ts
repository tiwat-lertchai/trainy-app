import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Database } from "../../db";
import type { DrizzleStudentProfileRepository } from "./student-profile.repository";

let database: Database;
let closeDatabase: () => Promise<void>;
let repository: DrizzleStudentProfileRepository;

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
  const repositoryModule = await import("./student-profile.repository");
  database = databaseModule.db;
  closeDatabase = databaseModule.closeDatabase;
  repository = new repositoryModule.DrizzleStudentProfileRepository(database);
  await database.delete(schema.studentProfile);
  await database.delete(schema.user);
  await database.insert(schema.user).values({
    id: "profile-student",
    name: "Profile Student",
    email: "profile-student@example.test",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

afterAll(async () => closeDatabase());

describe("DrizzleStudentProfileRepository", () => {
  test("persists and updates the owner's complete sensitive profile", async () => {
    expect(await repository.isComplete("profile-student")).toBe(false);
    await repository.upsert("profile-student", {
      dateOfBirth: "2003-05-17",
      gender: "prefer_not_to_say",
      address: "123 Bangkok, Thailand",
      cumulativeGpa: 3.42,
      lastTermGpa: 3.75,
      emergencyContactName: "Emergency Contact",
      emergencyContactRelationship: "Parent",
      emergencyContactPhone: "0812345678",
      bloodType: "unknown",
      medicalConditions: "None",
      allergies: "None",
      medications: "None",
      accessibilityNeeds: "None",
    });
    expect(await repository.isComplete("profile-student")).toBe(true);
    expect(await repository.findMine("profile-student")).toMatchObject({
      userId: "profile-student",
      emergencyContactPhone: "0812345678",
      cumulativeGpa: "3.42",
      lastTermGpa: "3.75",
    });
  });
});
