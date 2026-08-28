import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleInternshipRepository } from "./internship.repository";
import {
  applicationIdParamSchema,
  createApplicationSchema,
  createInternshipSchema,
  internshipIdParamSchema,
  updateApplicationStatusSchema,
  updateInternshipSchema,
} from "./internship.schema";
import { InternshipService } from "./internship.service";

const service = new InternshipService(new DrizzleInternshipRepository(db));
const organizationParamSchema = z.object({ organizationId: z.string().uuid() });

export const internshipRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/", async (c) => c.json({ data: await service.listPublishedInternships() }))
  .get("/applications/me", async (c) =>
    c.json({ data: await service.listMyApplications(c.get("authUser").id) }),
  )
  .get(
    "/universities/:organizationId/applications",
    zValidator("param", organizationParamSchema),
    async (c) =>
      c.json({
        data: await service.listUniversityApplications(
          c.get("authUser").id,
          c.req.valid("param").organizationId,
        ),
      }),
  )
  .patch(
    "/applications/:applicationId/status",
    zValidator("param", applicationIdParamSchema),
    zValidator("json", updateApplicationStatusSchema),
    async (c) =>
      c.json({
        data: await service.reviewApplication({
          actorUserId: c.get("authUser").id,
          applicationId: c.req.valid("param").applicationId,
          ...c.req.valid("json"),
        }),
      }),
  )
  .post(
    "/applications/:applicationId/withdraw",
    zValidator("param", applicationIdParamSchema),
    async (c) =>
      c.json({
        data: await service.withdrawApplication(
          c.get("authUser").id,
          c.req.valid("param").applicationId,
        ),
      }),
  )
  .post(
    "/companies/:organizationId",
    zValidator("param", organizationParamSchema),
    zValidator("json", createInternshipSchema),
    async (c) =>
      c.json(
        {
          data: await service.createInternship({
            actorUserId: c.get("authUser").id,
            companyOrganizationId: c.req.valid("param").organizationId,
            ...c.req.valid("json"),
          }),
        },
        201,
      ),
  )
  .get("/companies/:organizationId", zValidator("param", organizationParamSchema), async (c) =>
    c.json({
      data: await service.listCompanyInternships(
        c.get("authUser").id,
        c.req.valid("param").organizationId,
      ),
    }),
  )
  .get("/:internshipId", zValidator("param", internshipIdParamSchema), async (c) =>
    c.json({
      data: await service.getInternship(c.get("authUser").id, c.req.valid("param").internshipId),
    }),
  )
  .patch(
    "/:internshipId",
    zValidator("param", internshipIdParamSchema),
    zValidator("json", updateInternshipSchema),
    async (c) =>
      c.json({
        data: await service.updateInternship({
          actorUserId: c.get("authUser").id,
          internshipId: c.req.valid("param").internshipId,
          ...c.req.valid("json"),
        }),
      }),
  )
  .post(
    "/:internshipId/applications",
    zValidator("param", internshipIdParamSchema),
    zValidator("json", createApplicationSchema),
    async (c) =>
      c.json(
        {
          data: await service.apply({
            actorUserId: c.get("authUser").id,
            internshipId: c.req.valid("param").internshipId,
            ...c.req.valid("json"),
          }),
        },
        201,
      ),
  )
  .get("/:internshipId/applications", zValidator("param", internshipIdParamSchema), async (c) =>
    c.json({
      data: await service.listInternshipApplications(
        c.get("authUser").id,
        c.req.valid("param").internshipId,
      ),
    }),
  );
