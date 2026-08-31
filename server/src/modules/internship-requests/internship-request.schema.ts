import { z } from "zod";

export const internshipRequestTypes = ["regular", "cooperative"] as const;
export const internshipRequestSteps = ["advisor", "program_chair", "center"] as const;
export type InternshipRequestStep = (typeof internshipRequestSteps)[number];

const requiredText = z.string().trim().min(2).max(200);

const editableRequestFields = {
  positionTitle: requiredText,
  description: z.string().trim().min(10).max(5000),
  proposedStartDate: z.coerce.date(),
  proposedEndDate: z.coerce.date(),
  companyOrganizationId: z.string().uuid().optional(),
  companyNameProposed: requiredText.optional(),
  companyContactName: requiredText.optional(),
  companyContactEmail: z.string().trim().email().max(320).optional(),
  companyContactPhone: z.string().trim().min(8).max(30).optional(),
};

const editableInternshipRequestSchema = z.object(editableRequestFields);

function validateEditableRequest(
  value: z.infer<typeof editableInternshipRequestSchema>,
  context: z.RefinementCtx,
) {
  if (value.proposedEndDate <= value.proposedStartDate) {
    context.addIssue({
      code: "custom",
      path: ["proposedEndDate"],
      message: "End date must be after start date",
    });
  }
  const hasCompanyOrg = value.companyOrganizationId !== undefined;
  const hasProposed = value.companyNameProposed !== undefined;
  if (hasCompanyOrg === hasProposed) {
    context.addIssue({
      code: "custom",
      message: "Provide exactly one of companyOrganizationId or companyNameProposed",
    });
  }
  if (!hasCompanyOrg) {
    if (!value.companyContactName || !value.companyContactEmail || !value.companyContactPhone) {
      context.addIssue({
        code: "custom",
        message: "Contact name, email, and phone are required when proposing a new company",
      });
    }
  }
}

export const createInternshipRequestSchema = z
  .object({
    universityOrganizationId: z.string().uuid(),
    academicMajorId: z.string().uuid(),
    type: z.enum(internshipRequestTypes),
    semester: z.number().int().min(1).max(3),
    academicYear: z.number().int().min(2400).max(2800),
    advisorUserId: z.string().trim().min(1),
    ...editableRequestFields,
  })
  .superRefine(validateEditableRequest);

export const resubmitInternshipRequestSchema =
  editableInternshipRequestSchema.superRefine(validateEditableRequest);

export const reviewStepSchema = z
  .object({
    decision: z.enum(["approved", "rejected", "revision_requested"]),
    note: z.string().trim().min(3).max(5000).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision !== "approved" && !value.note)
      context.addIssue({ code: "custom", message: "A note is required for this decision" });
  });

export const advisorOptionsQuerySchema = z.object({
  universityOrganizationId: z.string().uuid(),
});

export const requestIdParamSchema = z.object({ requestId: z.string().uuid() });
export const requestStepParamSchema = z.object({
  requestId: z.string().uuid(),
  step: z.enum(internshipRequestSteps),
});
