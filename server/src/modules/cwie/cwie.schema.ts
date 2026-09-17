import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)");
const requiredText = z.string().trim().min(3).max(10_000);
const optionalText = z.string().trim().max(10_000).optional();

export const dailyLogInputSchema = z.object({
  type: z.literal("daily_log"),
  placementId: z.string().uuid(),
  workDate: isoDate,
  activities: requiredText,
  learning: requiredText,
  problems: optionalText,
  solutions: optionalText,
  hoursWorked: z.number().int().min(0).max(24),
});

export const weeklyPlanInputSchema = z
  .object({
    type: z.literal("weekly_plan"),
    placementId: z.string().uuid(),
    periodStart: isoDate,
    periodEnd: isoDate,
    weekNumber: z.number().int().min(1).max(60),
    plannedTasks: requiredText,
    actualTasks: requiredText,
    problems: optionalText,
    solutions: optionalText,
    plannedHours: z.number().int().min(0).max(168),
    hoursWorked: z.number().int().min(0).max(168),
    completionPercentage: z.number().int().min(0).max(100),
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    message: "Period end must not precede period start",
    path: ["periodEnd"],
  });

export const experienceInputSchema = z.object({
  type: z.literal("experience"),
  placementId: z.string().uuid(),
  workDate: isoDate,
  activities: requiredText,
  learning: requiredText,
  problems: requiredText,
  solutions: requiredText,
  outcomes: requiredText,
});

export const cwieEntryInputSchema = z.discriminatedUnion("type", [
  dailyLogInputSchema,
  weeklyPlanInputSchema,
  experienceInputSchema,
]);

const visitFields = {
  placementId: z.string().uuid(),
  visitNumber: z.number().int().min(1).max(3),
  scheduledAt: z.coerce.date(),
  mode: z.enum(["onsite", "online"]),
  location: z.string().trim().min(3).max(500).optional(),
  notes: z.string().trim().max(5_000).optional(),
};

export const visitInputSchema = z
  .object(visitFields)
  .refine((value) => value.mode !== "onsite" || value.location, {
    message: "An onsite visit requires a location",
    path: ["location"],
  });

export const visitUpdateSchema = z
  .object({
    ...visitFields,
    status: z.enum(["scheduled", "cancelled"]).optional(),
  })
  .omit({ placementId: true })
  .refine((value) => value.mode !== "onsite" || value.location, {
    message: "An onsite visit requires a location",
    path: ["location"],
  });

export const visitReportSchema = z.object({
  visitedAt: z.coerce.date(),
  workObserved: requiredText,
  studentProgress: requiredText,
  issuesFound: requiredText,
  solutionsAgreed: requiredText,
  recommendations: requiredText,
});

export const monthlySummaryInputSchema = z.object({
  placementId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Expected a month (YYYY-MM)"),
  summary: requiredText,
  achievements: requiredText,
  challenges: requiredText,
  nextMonthPlan: requiredText,
  totalHours: z.number().int().min(0).max(744),
});

export const reviewSchema = z
  .object({
    decision: z.enum(["approved", "revision_requested"]),
    comment: z.string().trim().min(3).max(5_000).optional(),
  })
  .refine((value) => value.decision !== "revision_requested" || value.comment, {
    message: "A comment is required when requesting revision",
    path: ["comment"],
  });

export const placementParamSchema = z.object({ placementId: z.string().uuid() });
export const entryParamSchema = z.object({ entryId: z.string().uuid() });
export const visitParamSchema = z.object({ visitId: z.string().uuid() });
export const summaryParamSchema = z.object({ summaryId: z.string().uuid() });

export type CwieEntryInput = z.infer<typeof cwieEntryInputSchema>;
export type MonthlySummaryInput = z.infer<typeof monthlySummaryInputSchema>;
export type VisitInput = z.infer<typeof visitInputSchema>;
