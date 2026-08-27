const auditedMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isAuditedMethod(method: string) {
  return auditedMethods.has(method.toUpperCase());
}
