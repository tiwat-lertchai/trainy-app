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
import { DrizzleRubricRepository } from "./rubric.repository";
import {
  rubricPlacementParamSchema,
  rubricSubmissionParamSchema,
  saveRubricSchema,
} from "./rubric.schema";
import { RubricEvaluationService } from "./rubric.service";
const service = new EvaluationService(
  new DrizzleEvaluationRepository(db),
  () => new Date(),
  domainNotifier,
);
const rubricService = new RubricEvaluationService(
  new DrizzleRubricRepository(db),
  () => new Date(),
  domainNotifier,
);
export const evaluationRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get(
    "/rubrics/placements/:placementId",
    zValidator("param", rubricPlacementParamSchema),
    async (c) =>
      c.json({
        data: await rubricService.getForm(c.get("authUser").id, c.req.valid("param").placementId),
      }),
  )
  .post("/rubrics", zValidator("json", saveRubricSchema), async (c) =>
    c.json({ data: await rubricService.save(c.get("authUser").id, c.req.valid("json")) }, 201),
  )
  .post(
    "/rubrics/:submissionId/submit",
    zValidator("param", rubricSubmissionParamSchema),
    async (c) =>
      c.json({
        data: await rubricService.submit(c.get("authUser").id, c.req.valid("param").submissionId),
      }),
  )
  .get(
    "/rubrics/placements/:placementId/result",
    zValidator("param", rubricPlacementParamSchema),
    async (c) =>
      c.json({
        data: await rubricService.result(c.get("authUser").id, c.req.valid("param").placementId),
      }),
  )
  .post("/", zValidator("json", saveEvaluationSchema), async (c) => {
    const { placementId, ...scores } = c.req.valid("json");
    return c.json({ data: await service.save(c.get("authUser").id, placementId, scores) }, 201);
  })
  .get("/placements/:placementId", zValidator("param", placementIdParamSchema), async (c) =>
    c.json({
      data: await service.list(c.get("authUser").id, c.req.valid("param").placementId),
    }),
  )
  .post("/:evaluationId/submit", zValidator("param", evaluationIdParamSchema), async (c) =>
    c.json({
      data: await service.submit(c.get("authUser").id, c.req.valid("param").evaluationId),
    }),
  );
