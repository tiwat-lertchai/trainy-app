import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleDocumentRepository } from "./document.repository";
import {
  documentIdParamSchema,
  reviewDocumentSchema,
  submitDocumentSchema,
} from "./document.schema";
import { DocumentService } from "./document.service";
import { domainNotifier } from "../notifications/notification.instance";
const service = new DocumentService(
  new DrizzleDocumentRepository(db),
  () => new Date(),
  domainNotifier,
);
const placementParam = z.object({ placementId: z.string().uuid() });
export const documentRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .post("/", zValidator("json", submitDocumentSchema), async (c) =>
    c.json(
      {
        data: await service.submit({
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
  .post(
    "/:documentId/review",
    zValidator("param", documentIdParamSchema),
    zValidator("json", reviewDocumentSchema),
    async (c) =>
      c.json({
        data: await service.review(
          c.get("authUser").id,
          c.req.valid("param").documentId,
          c.req.valid("json").decision,
          c.req.valid("json").feedback,
        ),
      }),
  );
