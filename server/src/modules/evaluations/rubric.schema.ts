import { z } from "zod";

export const rubricPlacementParamSchema = z.object({ placementId: z.string().uuid() });
export const rubricSubmissionParamSchema = z.object({ submissionId: z.string().uuid() });
export const saveRubricSchema = z.object({
  placementId: z.string().uuid(),
  componentId: z.string().uuid(),
  comment: z.string().trim().max(5000).default(""),
  scores: z
    .array(z.object({ criterionId: z.string().uuid(), score: z.number().int().min(0) }))
    .min(1),
});
