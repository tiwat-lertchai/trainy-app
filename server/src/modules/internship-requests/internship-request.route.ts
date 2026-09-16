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
  resubmitInternshipRequestSchema,
  reviewStepSchema,
  submitInternshipRequestSchema,
  updateDraftInternshipRequestSchema,
} from "./internship-request.schema";
import { InternshipRequestService } from "./internship-request.service";
import { DrizzleStudentProfileRepository } from "../student-profile/student-profile.repository";

const service = new InternshipRequestService(
  new DrizzleInternshipRequestRepository(db),
  new DrizzleStudentProfileRepository(db),
);

export const internshipRequestRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createInternshipRequestSchema), async (c) =>
    c.json(
      {
        data: await service.createDraft({
          actorUserId: c.get("authUser").id,
          ...c.req.valid("json"),
        }),
      },
      201,
    ),
  )
  .post(
    "/:requestId/submit",
    zValidator("param", requestIdParamSchema),
    zValidator("json", submitInternshipRequestSchema),
    async (c) =>
      c.json({
        data: await service.submit(
          c.get("authUser").id,
          c.req.valid("param").requestId,
          c.req.valid("json").idempotencyKey,
        ),
      }),
  )
  .get("/me", async (c) => c.json({ data: await service.getMine(c.get("authUser").id) }))
  .patch(
    "/:requestId",
    zValidator("param", requestIdParamSchema),
    zValidator("json", updateDraftInternshipRequestSchema),
    async (c) =>
      c.json({
        data: await service.updateDraft(
          c.get("authUser").id,
          c.req.valid("param").requestId,
          c.req.valid("json"),
        ),
      }),
  )
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
  .post(
    "/:requestId/resubmit",
    zValidator("param", requestIdParamSchema),
    zValidator("json", resubmitInternshipRequestSchema),
    async (c) => {
      const body = c.req.valid("json");
      const { idempotencyKey, ...updates } = body;
      return c.json({
        data: await service.resubmit(
          c.get("authUser").id,
          c.req.valid("param").requestId,
          updates,
          idempotencyKey,
        ),
      });
    },
  )
  .post("/:requestId/cancel", zValidator("param", requestIdParamSchema), async (c) =>
    c.json({
      data: await service.cancelRequest(c.get("authUser").id, c.req.valid("param").requestId),
    }),
  );
