import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleProgressRepository } from "./progress.repository";
import {
  createProgressSchema,
  reportIdParamSchema,
  reviewProgressSchema,
  updateProgressSchema,
} from "./progress.schema";
import { ProgressService } from "./progress.service";
import { domainNotifier } from "../notifications/notification.instance";

const service = new ProgressService(
  new DrizzleProgressRepository(db),
  () => new Date(),
  domainNotifier,
);
const placementParam = z.object({ placementId: z.string().uuid() });

export const progressRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createProgressSchema), async (c) =>
    c.json(
      {
        data: await service.create({
          actorUserId: c.get("authUser").id,
          ...c.req.valid("json"),
        }),
      },
      201,
    ),
  )
  .get(
    "/placements/:placementId",
    zValidator("param", placementParam),
    async (c) =>
      c.json({
        data: await service.list(
          c.get("authUser").id,
          c.req.valid("param").placementId,
        ),
      }),
  )
  .patch(
    "/:reportId",
    zValidator("param", reportIdParamSchema),
    zValidator("json", updateProgressSchema),
    async (c) =>
      c.json({
        data: await service.update(
          c.get("authUser").id,
          c.req.valid("param").reportId,
          c.req.valid("json"),
        ),
      }),
  )
  .post(
    "/:reportId/submit",
    zValidator("param", reportIdParamSchema),
    async (c) =>
      c.json({
        data: await service.submit(
          c.get("authUser").id,
          c.req.valid("param").reportId,
        ),
      }),
  )
  .post(
    "/:reportId/review",
    zValidator("param", reportIdParamSchema),
    zValidator("json", reviewProgressSchema),
    async (c) =>
      c.json({
        data: await service.review(
          c.get("authUser").id,
          c.req.valid("param").reportId,
          c.req.valid("json").decision,
          c.req.valid("json").feedback,
        ),
      }),
  );
