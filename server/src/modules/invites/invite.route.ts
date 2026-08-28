import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleInviteRepository } from "./invite.repository";
import { createInviteSchema, inviteIdParamSchema, inviteTokenParamSchema } from "./invite.schema";
import { InviteService } from "./invite.service";

const service = new InviteService(new DrizzleInviteRepository(db));

const organizationIdParamSchema = z.object({ organizationId: z.string().uuid() });

export const inviteRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .post("/", zValidator("json", createInviteSchema), async (c) =>
    c.json(
      {
        data: await service.createInvite({
          actorUserId: c.get("authUser").id,
          ...c.req.valid("json"),
        }),
      },
      201,
    ),
  )
  .get(
    "/organization/:organizationId",
    zValidator("param", organizationIdParamSchema),
    async (c) =>
      c.json({
        data: await service.listInvites(
          c.get("authUser").id,
          c.req.valid("param").organizationId,
        ),
      }),
  )
  .delete("/:inviteId", zValidator("param", inviteIdParamSchema), async (c) =>
    c.json({
      data: await service.revokeInvite(c.get("authUser").id, c.req.valid("param").inviteId),
    }),
  )
  .post("/:token/redeem", zValidator("param", inviteTokenParamSchema), async (c) =>
    c.json({
      data: await service.redeemInvite(c.get("authUser").id, c.req.valid("param").token),
    }),
  );
