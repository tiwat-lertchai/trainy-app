import { z } from "zod";
export const documentTypes = [
  "resume",
  "consent",
  "progress_evidence",
  "final_report",
  "other",
] as const;
export const submitDocumentSchema = z.object({
  placementId: z.string().uuid(),
  type: z.enum(documentTypes),
  fileName: z.string().trim().min(1).max(255),
  storageKey: z
    .string()
    .trim()
    .min(16)
    .max(1024)
    .regex(/^[a-zA-Z0-9/_\-.]+$/),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  sizeBytes: z
    .number()
    .int()
    .min(1)
    .max(20 * 1024 * 1024),
});
export const reviewDocumentSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    feedback: z.string().trim().min(3).max(5000).optional(),
  })
  .refine((v) => v.decision !== "rejected" || v.feedback, {
    message: "Feedback is required when rejecting a document",
  });
export const documentIdParamSchema = z.object({
  documentId: z.string().uuid(),
});
