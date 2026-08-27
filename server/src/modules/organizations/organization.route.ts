import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import {
  type AuthVariables,
  requireAuth,
} from "../../middleware/require-auth";
import { DrizzleOrganizationRepository } from "./organization.repository";
import {
  addMembershipSchema,
  createOrganizationSchema,
  updateMembershipSchema,
} from "./organization.schema";
import { OrganizationService } from "./organization.service";

const organizationService = new OrganizationService(
  new DrizzleOrganizationRepository(db),
);

export const organizationRoute = new Hono<{
  Variables: AuthVariables;
}>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createOrganizationSchema), async (c) => {
    const input = c.req.valid("json");
    const organization = await organizationService.createOrganization({
      actorUserId: c.get("authUser").id,
      ...input,
    });

    return c.json({ data: organization }, 201);
  })
  .get("/", async (c) => {
    const organizations = await organizationService.listOrganizations(
      c.get("authUser").id,
    );

    return c.json({ data: organizations });
  })
  .get("/:organizationId", async (c) => {
    const organization = await organizationService.getOrganization(
      c.get("authUser").id,
      c.req.param("organizationId"),
    );

    return c.json({ data: organization });
  })
  .get("/:organizationId/members", async (c) => {
    const memberships = await organizationService.listMemberships(
      c.get("authUser").id,
      c.req.param("organizationId"),
    );

    return c.json({ data: memberships });
  })
  .post(
    "/:organizationId/members",
    zValidator("json", addMembershipSchema),
    async (c) => {
      const membership = await organizationService.addMembership({
        actorUserId: c.get("authUser").id,
        organizationId: c.req.param("organizationId"),
        ...c.req.valid("json"),
      });

      return c.json({ data: membership }, 201);
    },
  )
  .patch(
    "/:organizationId/members/:membershipId",
    zValidator("json", updateMembershipSchema),
    async (c) => {
      const membership = await organizationService.updateMembership({
        actorUserId: c.get("authUser").id,
        organizationId: c.req.param("organizationId"),
        membershipId: c.req.param("membershipId"),
        ...c.req.valid("json"),
      });

      return c.json({ data: membership });
    },
  );
