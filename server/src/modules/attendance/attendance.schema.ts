import { z } from "zod";

const coordinate = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(10_000),
});
export const saveScheduleSchema = z
  .object({
    days: z
      .array(
        z
          .object({
            weekday: z.number().int().min(0).max(6),
            startMinute: z.number().int().min(0).max(1439),
            endMinute: z.number().int().min(1).max(1440),
            breakMinutes: z.number().int().min(0).max(600),
            graceMinutes: z.number().int().min(0).max(180),
          })
          .refine((day) => day.endMinute > day.startMinute, "End time must be after start time"),
      )
      .min(1)
      .max(7),
    timezone: z.literal("Asia/Bangkok").default("Asia/Bangkok"),
    locationPolicy: z.enum(["disabled", "optional", "required_onsite"]),
    geofence: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radiusMeters: z.number().int().min(25).max(10_000),
      })
      .optional(),
  })
  .refine(
    (value) => value.locationPolicy !== "required_onsite" || value.geofence,
    "A geofence is required for onsite location checks",
  );
export const attendanceActionSchema = z
  .object({
    location: coordinate.optional(),
    locationExceptionReason: z.string().trim().min(5).max(500).optional(),
    note: z.string().trim().max(2_000).optional(),
  })
  .refine(
    (value) => !(value.location && value.locationExceptionReason),
    "Send location or an exception reason, not both",
  );
export const createAdjustmentSchema = z
  .object({
    proposedCheckInAt: z.coerce.date().optional(),
    proposedCheckOutAt: z.coerce.date().optional(),
    reason: z.string().trim().min(10).max(2_000),
  })
  .refine(
    (value) => value.proposedCheckInAt || value.proposedCheckOutAt,
    "At least one proposed time is required",
  );
export const reviewAdjustmentSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().min(3).max(2_000),
});
export const placementIdParamSchema = z.object({ placementId: z.string().uuid() });
export const attendanceIdParamSchema = z.object({ attendanceId: z.string().uuid() });
export const adjustmentIdParamSchema = z.object({ adjustmentId: z.string().uuid() });
export const organizationIdParamSchema = z.object({ organizationId: z.string().uuid() });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)");
export const attendanceRangeQuerySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
});
export const universitySummaryQuerySchema = z.object({ from: isoDate, to: isoDate });
