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

  test("rejects a different branch host", () => {
    expect(() =>
      validateNeonTestTarget({ ...valid, expectedHost: "production-pooler.aws.neon.tech" }),
    ).toThrow("does not match");
  });

  test("rejects non-test, non-Neon, and non-TLS targets", () => {
    expect(() => validateNeonTestTarget({ ...valid, databaseEnvironment: "production" })).toThrow(
      "explicitly set to test",
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
