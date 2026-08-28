import { z } from "zod";
import { organizationRoles } from "../organizations/organization.schema";

const requiredText = z.string().trim().min(2).max(200);
const optionalText = z.string().trim().min(2).max(500).optional();
const contact = {
  fullName: requiredText,
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(8).max(30),
};

export const onboardingRoles = organizationRoles;

export const submitOnboardingSchema = z.discriminatedUnion("requestedRole", [
  z.object({
    requestedRole: z.literal("student"),
    targetOrganizationId: z.string().uuid(),
    profile: z.object({
      ...contact,
      studentId: requiredText,
      faculty: requiredText,
      major: requiredText,
      yearLevel: z.string().trim().min(1).max(20),
    }),
  }),
  z.object({
    requestedRole: z.literal("advisor"),
    targetOrganizationId: z.string().uuid(),
    profile: z.object({
      ...contact,
      faculty: requiredText,
      department: requiredText,
      academicTitle: optionalText,
      employeeId: optionalText,
    }),
  }),
  z.object({
    requestedRole: z.literal("coordinator"),
    targetOrganizationId: z.string().uuid(),
    profile: z.object({
      ...contact,
      department: requiredText,
      jobTitle: requiredText,
      employeeId: optionalText,
    }),
  }),
  z.object({
    requestedRole: z.literal("university_admin"),
    targetOrganizationId: z.string().uuid(),
    profile: z.object({
      ...contact,
      department: requiredText,
      jobTitle: requiredText,
      employeeId: optionalText,
    }),
  }),
  z.object({
    requestedRole: z.literal("supervisor"),
    targetOrganizationId: z.string().uuid(),
    profile: z.object({
      ...contact,
      department: requiredText,
      jobTitle: requiredText,
      expertise: optionalText,
    }),
  }),
  z.object({
    requestedRole: z.literal("company_admin"),
    profile: z.object({ ...contact, department: requiredText, jobTitle: requiredText }),
    organization: z.object({
      name: requiredText,
      slug: z
        .string()
        .trim()
        .min(2)
        .max(80)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      registrationNumber: requiredText,
      businessType: requiredText,
      address: z.string().trim().min(10).max(1000),
      website: z.string().trim().url().max(500).optional(),
      email: z.string().trim().email().max(320),
      phone: z.string().trim().min(8).max(30),
      evidenceReference: requiredText,
    }),
  }),
]);

export const reviewOnboardingSchema = z
  .object({
    decision: z.enum(["approved", "rejected", "revision_requested"]),
    note: z.string().trim().min(3).max(5000).optional(),
    documentsVerified: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.decision !== "approved" && !value.note)
      context.addIssue({ code: "custom", message: "A review note is required" });
  });

export const onboardingIdParamSchema = z.object({ onboardingId: z.string().uuid() });
