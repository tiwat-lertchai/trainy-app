import { z } from "zod";
export const documentTypes = [
  "resume",
  "consent",
  "progress_evidence",
  "final_report",
  "other",
] as const;
export const uploadDocumentSchema = z.object({
  placementId: z.string().uuid(),
  type: z.enum(documentTypes),
  file: z.instanceof(File)
    .refine((file) => file.name.trim().length > 0 && file.name.length <= 255, "File name must be between 1 and 255 characters")
    .refine((file) => ["application/pdf", "image/jpeg", "image/png"].includes(file.type), "File type is not allowed")
    .refine((file) => file.size > 0 && file.size <= 20 * 1024 * 1024, "File must be between 1 byte and 20 MiB"),
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
