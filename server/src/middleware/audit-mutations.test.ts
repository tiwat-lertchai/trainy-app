import { describe, expect, test } from "bun:test";
import { isAuditedMethod } from "./audit-method";
describe("audit mutation filter", () => {
  test("audits state-changing methods", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"])
      expect(isAuditedMethod(method)).toBe(true);
  });
  test("does not audit read-only methods", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) expect(isAuditedMethod(method)).toBe(false);
  });
});
