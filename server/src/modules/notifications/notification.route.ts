import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { notificationService as service } from "./notification.instance";
const params = z.object({ notificationId: z.string().uuid() });
export const notificationRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/", async (c) =>
    c.json({ data: await service.list(c.get("authUser").id) }),
  )
  .post("/:notificationId/read", zValidator("param", params), async (c) =>
    c.json({
      data: await service.markRead(
        c.get("authUser").id,
        c.req.valid("param").notificationId,
      ),
    }),
  );
