import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleEvaluationRepository } from "./evaluation.repository";
import {
  evaluationIdParamSchema,
  placementIdParamSchema,
  saveEvaluationSchema,
} from "./evaluation.schema";
import { EvaluationService } from "./evaluation.service";
import { domainNotifier } from "../notifications/notification.instance";
const service = new EvaluationService(
  new DrizzleEvaluationRepository(db),
  () => new Date(),
  domainNotifier,
);
export const evaluationRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .post("/", zValidator("json", saveEvaluationSchema), async (c) => {
    const { placementId, ...scores } = c.req.valid("json");
    return c.json(
      { data: await service.save(c.get("authUser").id, placementId, scores) },
      201,
    );
  })
  .get(
    "/placements/:placementId",
    zValidator("param", placementIdParamSchema),
    async (c) =>
      c.json({
        data: await service.list(
          c.get("authUser").id,
          c.req.valid("param").placementId,
        ),
      }),
  )
  .post(
    "/:evaluationId/submit",
    zValidator("param", evaluationIdParamSchema),
    async (c) =>
      c.json({
        data: await service.submit(
          c.get("authUser").id,
          c.req.valid("param").evaluationId,
        ),
      }),
  );
