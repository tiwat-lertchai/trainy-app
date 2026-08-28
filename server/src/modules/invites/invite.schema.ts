import { z } from "zod";

export const inviteRoles = ["company_admin", "supervisor"] as const;
export type InviteRole = (typeof inviteRoles)[number];

const organizationName = z.string().trim().min(2).max(160);

export const createInviteSchema = z
  .object({
    organizationId: z.string().uuid(),
    role: z.enum(inviteRoles),
    targetOrganizationId: z.string().uuid().optional(),
    proposedOrganizationName: organizationName.optional(),
  })
  .superRefine((value, context) => {
    const hasTarget = value.targetOrganizationId !== undefined;
    const hasProposed = value.proposedOrganizationName !== undefined;
    if (hasTarget === hasProposed) {
      context.addIssue({
        code: "custom",
        message: "Provide exactly one of targetOrganizationId or proposedOrganizationName",
      });
    }
  });

export const inviteIdParamSchema = z.object({ inviteId: z.string().uuid() });
export const inviteTokenParamSchema = z.object({ token: z.string().min(1).max(200) });
