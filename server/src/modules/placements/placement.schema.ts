import { z } from "zod";

export const placementStatuses = ["pending", "active", "completed", "cancelled"] as const;
export type PlacementStatus = (typeof placementStatuses)[number];

export const createPlacementSchema = z
  .object({
    applicationId: z.string().uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: "End date must be after start date",
  });

export const createPlacementFromRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: "End date must be after start date",
  });

export const assignAdvisorSchema = z.object({
  advisorUserId: z.string().min(1),
});
export const assignSupervisorSchema = z.object({
  supervisorUserId: z.string().min(1),
});
export const updatePlacementStatusSchema = z.object({
  status: z.enum(["active", "completed", "cancelled"]),
});
export const placementIdParamSchema = z.object({
  placementId: z.string().uuid(),
});
