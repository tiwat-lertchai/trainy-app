import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleAttendanceRepository } from "./attendance.repository";
import {
  adjustmentIdParamSchema,
  attendanceActionSchema,
  attendanceIdParamSchema,
  attendanceRangeQuerySchema,
  createAdjustmentSchema,
  organizationIdParamSchema,
  placementIdParamSchema,
  reviewAdjustmentSchema,
  saveScheduleSchema,
  universitySummaryQuerySchema,
} from "./attendance.schema";
import { AttendanceService } from "./attendance.service";

const service = new AttendanceService(new DrizzleAttendanceRepository(db));

export const attendanceRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .put(
    "/:placementId/schedule",
    zValidator("param", placementIdParamSchema),
    zValidator("json", saveScheduleSchema),
    async (c) =>
      c.json({
        data: await service.saveSchedule(
          c.get("authUser").id,
          c.req.valid("param").placementId,
          c.req.valid("json"),
        ),
      }),
  )
  .get("/:placementId/schedule", zValidator("param", placementIdParamSchema), async (c) =>
    c.json({
      data: await service.listSchedules(c.get("authUser").id, c.req.valid("param").placementId),
    }),
  )
  .post(
    "/:placementId/check-in",
    zValidator("param", placementIdParamSchema),
    zValidator("json", attendanceActionSchema),
    async (c) =>
      c.json(
        {
          data: await service.checkIn(
            c.get("authUser").id,
            c.req.valid("param").placementId,
            c.req.valid("json"),
          ),
        },
        201,
      ),
  )
  .post(
    "/:attendanceId/check-out",
    zValidator("param", attendanceIdParamSchema),
    zValidator("json", attendanceActionSchema),
    async (c) =>
      c.json({
        data: await service.checkOut(
          c.get("authUser").id,
          c.req.valid("param").attendanceId,
          c.req.valid("json"),
        ),
      }),
  )
  .get(
    "/:placementId",
    zValidator("param", placementIdParamSchema),
    zValidator("query", attendanceRangeQuerySchema),
    async (c) =>
      c.json({
        data: await service.list(
          c.get("authUser").id,
          c.req.valid("param").placementId,
          c.req.valid("query").from,
          c.req.valid("query").to,
        ),
      }),
  )
  .post(
    "/:attendanceId/adjustments",
    zValidator("param", attendanceIdParamSchema),
    zValidator("json", createAdjustmentSchema),
    async (c) =>
      c.json(
        {
          data: await service.requestAdjustment(
            c.get("authUser").id,
            c.req.valid("param").attendanceId,
            c.req.valid("json"),
          ),
        },
        201,
      ),
  )
  .get("/:placementId/adjustments", zValidator("param", placementIdParamSchema), async (c) =>
    c.json({
      data: await service.listAdjustments(c.get("authUser").id, c.req.valid("param").placementId),
    }),
  )
  .post(
    "/adjustments/:adjustmentId/review",
    zValidator("param", adjustmentIdParamSchema),
    zValidator("json", reviewAdjustmentSchema),
    async (c) =>
      c.json({
        data: await service.reviewAdjustment(
          c.get("authUser").id,
          c.req.valid("param").adjustmentId,
          c.req.valid("json"),
        ),
      }),
  )
  .get(
    "/organizations/:organizationId/summary",
    zValidator("param", organizationIdParamSchema),
    zValidator("query", universitySummaryQuerySchema),
    async (c) =>
      c.json({
        data: await service.universitySummary(
          c.get("authUser").id,
          c.req.valid("param").organizationId,
          c.req.valid("query").from,
          c.req.valid("query").to,
        ),
      }),
  );
