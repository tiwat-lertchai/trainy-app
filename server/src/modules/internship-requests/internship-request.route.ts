import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleInternshipRequestRepository } from "./internship-request.repository";
import {
  advisorOptionsQuerySchema,
  createInternshipRequestSchema,
  requestIdParamSchema,
  requestStepParamSchema,
  reviewStepSchema,
} from "./internship-request.schema";
import { InternshipRequestService } from "./internship-request.service";

const service = new InternshipRequestService(new DrizzleInternshipRequestRepository(db));

export const internshipRequestRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createInternshipRequestSchema), async (c) =>
    c.json(
      {
        data: await service.createRequest({
          actorUserId: c.get("authUser").id,
          ...c.req.valid("json"),
        }),
      },
      201,
    ),
  )
  .get("/me", async (c) => c.json({ data: await service.getMine(c.get("authUser").id) }))
  .get("/options/advisors", zValidator("query", advisorOptionsQuerySchema), async (c) =>
    c.json({
      data: await service.listAdvisorOptions(
        c.get("authUser").id,
        c.req.valid("query").universityOrganizationId,
      ),
    }),
  )
  .get("/reviews", async (c) => c.json({ data: await service.listForReview(c.get("authUser").id) }))
  .post(
    "/:requestId/steps/:step/review",
    zValidator("param", requestStepParamSchema),
    zValidator("json", reviewStepSchema),
    async (c) => {
      const param = c.req.valid("param");
      const body = c.req.valid("json");
      return c.json({
        data: await service.reviewStep({
          actorUserId: c.get("authUser").id,
          requestId: param.requestId,
          step: param.step,
          decision: body.decision,
          note: body.note,
        }),
      });
    },
  )
  .post("/:requestId/resubmit", zValidator("param", requestIdParamSchema), async (c) =>
    c.json({
      data: await service.resubmit(c.get("authUser").id, c.req.valid("param").requestId),
    }),
  )
  .post("/:requestId/cancel", zValidator("param", requestIdParamSchema), async (c) =>
    c.json({
      data: await service.cancelRequest(c.get("authUser").id, c.req.valid("param").requestId),
    }),
  );
