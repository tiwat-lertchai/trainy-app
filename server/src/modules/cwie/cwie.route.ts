import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { domainNotifier } from "../notifications/notification.instance";
import { DrizzleCwieRepository } from "./cwie.repository";
import {
  cwieEntryInputSchema,
  entryParamSchema,
  monthlySummaryInputSchema,
  placementParamSchema,
  reviewSchema,
  summaryParamSchema,
  visitInputSchema,
  visitParamSchema,
  visitReportSchema,
  visitUpdateSchema,
} from "./cwie.schema";
import { CwieService } from "./cwie.service";

const service = new CwieService(new DrizzleCwieRepository(db), () => new Date(), domainNotifier);

export const cwieRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/placements/:placementId", zValidator("param", placementParamSchema), async (c) =>
    c.json({
      data: await service.getWorkspace(c.get("authUser").id, c.req.valid("param").placementId),
    }),
  )
  .post("/entries", zValidator("json", cwieEntryInputSchema), async (c) =>
    c.json({ data: await service.createEntry(c.get("authUser").id, c.req.valid("json")) }, 201),
  )
  .put(
    "/entries/:entryId",
    zValidator("param", entryParamSchema),
    zValidator("json", cwieEntryInputSchema),
    async (c) =>
      c.json({
        data: await service.updateEntry(
          c.get("authUser").id,
          c.req.valid("param").entryId,
          c.req.valid("json"),
        ),
      }),
  )
  .post("/entries/:entryId/submit", zValidator("param", entryParamSchema), async (c) =>
    c.json({
      data: await service.submitEntry(c.get("authUser").id, c.req.valid("param").entryId),
    }),
  )
  .post(
    "/entries/:entryId/review",
    zValidator("param", entryParamSchema),
    zValidator("json", reviewSchema),
    async (c) =>
      c.json({
        data: await service.reviewEntry(
          c.get("authUser").id,
          c.req.valid("param").entryId,
          c.req.valid("json").decision,
          c.req.valid("json").comment,
        ),
      }),
  )
  .post("/visits", zValidator("json", visitInputSchema), async (c) =>
    c.json({ data: await service.createVisit(c.get("authUser").id, c.req.valid("json")) }, 201),
  )
  .put(
    "/visits/:visitId",
    zValidator("param", visitParamSchema),
    zValidator("json", visitUpdateSchema),
    async (c) =>
      c.json({
        data: await service.updateVisit(
          c.get("authUser").id,
          c.req.valid("param").visitId,
          c.req.valid("json"),
        ),
      }),
  )
  .post(
    "/visits/:visitId/report",
    zValidator("param", visitParamSchema),
    zValidator("json", visitReportSchema),
    async (c) =>
      c.json({
        data: await service.saveVisitReport(
          c.get("authUser").id,
          c.req.valid("param").visitId,
          c.req.valid("json"),
        ),
      }),
  )
  .post("/monthly-summaries", zValidator("json", monthlySummaryInputSchema), async (c) =>
    c.json({ data: await service.createSummary(c.get("authUser").id, c.req.valid("json")) }, 201),
  )
  .put(
    "/monthly-summaries/:summaryId",
    zValidator("param", summaryParamSchema),
    zValidator("json", monthlySummaryInputSchema),
    async (c) =>
      c.json({
        data: await service.updateSummary(
          c.get("authUser").id,
          c.req.valid("param").summaryId,
          c.req.valid("json"),
        ),
      }),
  )
  .post(
    "/monthly-summaries/:summaryId/submit",
    zValidator("param", summaryParamSchema),
    async (c) =>
      c.json({
        data: await service.submitSummary(c.get("authUser").id, c.req.valid("param").summaryId),
      }),
  )
  .post(
    "/monthly-summaries/:summaryId/review",
    zValidator("param", summaryParamSchema),
    zValidator("json", reviewSchema),
    async (c) =>
      c.json({
        data: await service.reviewSummary(
          c.get("authUser").id,
          c.req.valid("param").summaryId,
          c.req.valid("json").decision,
          c.req.valid("json").comment,
        ),
      }),
  );
