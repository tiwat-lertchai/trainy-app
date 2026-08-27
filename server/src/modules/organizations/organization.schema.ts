import { z } from "zod";

export const organizationTypes = ["university", "company"] as const;
export type OrganizationType = (typeof organizationTypes)[number];

export const organizationRoles = [
  "university_admin",
  "coordinator",
  "advisor",
  "student",
  "company_admin",
  "supervisor",
] as const;
export type OrganizationRole = (typeof organizationRoles)[number];

export const membershipStatuses = ["active", "suspended"] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];

export const createOrganizationSchema = z.object({
  type: z.enum(organizationTypes),
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and single hyphens",
    ),
});

export const addMembershipSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(organizationRoles),
});

export const updateMembershipSchema = z
  .object({
    role: z.enum(organizationRoles).optional(),
    status: z.enum(membershipStatuses).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "At least one membership field must be provided",
  });
