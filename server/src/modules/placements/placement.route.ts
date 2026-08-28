import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzlePlacementRepository } from "./placement.repository";
import {
  assignAdvisorSchema,
  assignSupervisorSchema,
  createPlacementSchema,
  placementIdParamSchema,
  updatePlacementStatusSchema,
} from "./placement.schema";
import { PlacementService } from "./placement.service";

const service = new PlacementService(new DrizzlePlacementRepository(db));
const organizationParamSchema = z.object({ organizationId: z.string().uuid() });

export const placementRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createPlacementSchema), async (c) =>
    c.json(
      {
        data: await service.createPlacement({
          actorUserId: c.get("authUser").id,
          ...c.req.valid("json"),
        }),
      },
      201,
    ),
  )
  .get("/me", async (c) => c.json({ data: await service.listMyPlacements(c.get("authUser").id) }))
  .get("/organizations/:organizationId", zValidator("param", organizationParamSchema), async (c) =>
    c.json({
      data: await service.listOrganizationPlacements(
        c.get("authUser").id,
        c.req.valid("param").organizationId,
      ),
    }),
  )
  .patch(
    "/:placementId/advisor",
    zValidator("param", placementIdParamSchema),
    zValidator("json", assignAdvisorSchema),
    async (c) =>
      c.json({
        data: await service.assignAdvisor(
          c.get("authUser").id,
          c.req.valid("param").placementId,
          c.req.valid("json").advisorUserId,
        ),
      }),
  )
  .patch(
    "/:placementId/supervisor",
    zValidator("param", placementIdParamSchema),
    zValidator("json", assignSupervisorSchema),
    async (c) =>
      c.json({
        data: await service.assignSupervisor(
          c.get("authUser").id,
          c.req.valid("param").placementId,
          c.req.valid("json").supervisorUserId,
        ),
      }),
  )
  .patch(
    "/:placementId/status",
    zValidator("param", placementIdParamSchema),
    zValidator("json", updatePlacementStatusSchema),
    async (c) =>
      c.json({
        data: await service.updateStatus(
          c.get("authUser").id,
          c.req.valid("param").placementId,
          c.req.valid("json").status,
        ),
      }),
  );
