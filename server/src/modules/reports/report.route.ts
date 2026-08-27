import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleReportRepository } from "./report.repository";
import { ReportService } from "./report.service";
const service = new ReportService(new DrizzleReportRepository(db));
const params = z.object({ organizationId: z.string().uuid() });
export const reportRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get(
    "/organizations/:organizationId",
    zValidator("param", params),
    async (c) =>
      c.json({
        data: await service.organizationSummary(
          c.get("authUser").id,
          c.req.valid("param").organizationId,
        ),
      }),
  );
