import { z } from "zod";

export const internshipStatuses = ["draft", "published", "closed"] as const;
export type InternshipStatus = (typeof internshipStatuses)[number];

export const internshipWorkModes = ["onsite", "hybrid", "remote"] as const;
export type InternshipWorkMode = (typeof internshipWorkModes)[number];
export const internshipTypes = ["regular", "cooperative"] as const;
export type InternshipType = (typeof internshipTypes)[number];

export const semesterSchema = z.number().int().min(1).max(3);
export const academicYearSchema = z.number().int().min(2400).max(2800);

export const applicationStatuses = [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];

export const createInternshipSchema = z.object({
  title: z.string().trim().min(3).max(160),
  type: z.enum(internshipTypes),
  description: z.string().trim().min(20).max(10_000),
  location: z.string().trim().min(2).max(240),
  workMode: z.enum(internshipWorkModes),
  capacity: z.number().int().min(1).max(10_000),
  applicationDeadline: z.coerce.date(),
});

export const updateInternshipSchema = createInternshipSchema
  .partial()
  .extend({ status: z.enum(internshipStatuses).optional() })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one internship field must be provided",
  });

export const createApplicationSchema = z.object({
  universityOrganizationId: z.string().uuid(),
  semester: semesterSchema,
  academicYear: academicYearSchema,
  statement: z.string().trim().min(20).max(5_000),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(["under_review", "accepted", "rejected"]),
});

export const internshipIdParamSchema = z.object({
  internshipId: z.string().uuid(),
});
export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid(),
});
