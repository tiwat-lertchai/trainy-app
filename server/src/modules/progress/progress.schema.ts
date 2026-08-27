import { z } from "zod";

const content = {
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  summary: z.string().trim().min(20).max(10_000),
  hoursWorked: z.number().int().min(0).max(744),
};
export const createProgressSchema = z
  .object({ placementId: z.string().uuid(), ...content })
  .refine((v) => v.periodEnd >= v.periodStart, {
    message: "Period end must not precede period start",
  });
export const updateProgressSchema = z
  .object(content)
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "At least one field is required",
  });
export const reviewProgressSchema = z
  .object({
    decision: z.enum(["approved", "revision_requested"]),
    feedback: z.string().trim().min(3).max(5_000).optional(),
  })
  .refine((v) => v.decision !== "revision_requested" || v.feedback, {
    message: "Feedback is required when requesting revision",
  });
export const reportIdParamSchema = z.object({ reportId: z.string().uuid() });
