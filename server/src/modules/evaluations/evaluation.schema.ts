import { z } from "zod";
const score = z.number().int().min(1).max(5);
export const saveEvaluationSchema = z.object({
  placementId: z.string().uuid(),
  technicalScore: score,
  communicationScore: score,
  responsibilityScore: score,
  comment: z.string().trim().min(10).max(5000),
});
export const evaluationIdParamSchema = z.object({
  evaluationId: z.string().uuid(),
});
export const placementIdParamSchema = z.object({
  placementId: z.string().uuid(),
});
