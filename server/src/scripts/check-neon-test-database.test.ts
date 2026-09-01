import { describe, expect, test } from "bun:test";
import { validateNeonTestTarget } from "./check-neon-test-database";

const valid = {
  databaseUrl:
    "postgresql://test:secret@test-branch-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  databaseDriver: "neon",
  databaseEnvironment: "test",
  expectedHost: "test-branch-pooler.ap-southeast-1.aws.neon.tech",
};

describe("Neon test database target guard", () => {
  test("accepts an exact Neon test host with required TLS", () => {
    expect(validateNeonTestTarget(valid).hostname).toBe(valid.expectedHost);
  });

  test("requires an explicit second flag for a resettable production branch", () => {
    expect(() =>
      validateNeonTestTarget({ ...valid, databaseEnvironment: "production-resettable" }),
    ).toThrow("NEON_ALLOW_PRODUCTION_RESET=true");
    expect(
      validateNeonTestTarget({
        ...valid,
        databaseEnvironment: "production-resettable",
        allowProductionReset: "true",
      }).environment,
    ).toBe("production-resettable");
  });

  test("rejects a different branch host", () => {
    expect(() =>
      validateNeonTestTarget({ ...valid, expectedHost: "production-pooler.aws.neon.tech" }),
    ).toThrow("does not match");
  });

  test("rejects non-test, non-Neon, and non-TLS targets", () => {
    expect(() => validateNeonTestTarget({ ...valid, databaseEnvironment: "production" })).toThrow(
      "production-resettable",
    );
    expect(() =>
      validateNeonTestTarget({
        ...valid,
        databaseUrl: "postgresql://test:secret@localhost/trainy?sslmode=require",
        expectedHost: "localhost",
      }),
    ).toThrow("neon.tech");
    expect(() =>
      validateNeonTestTarget({
        ...valid,
        databaseUrl:
          "postgresql://test:secret@test-branch-pooler.ap-southeast-1.aws.neon.tech/neondb",
      }),
    ).toThrow("sslmode=require");
  });
});
