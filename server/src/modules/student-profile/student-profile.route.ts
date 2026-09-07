import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleStudentProfileRepository } from "./student-profile.repository";
import { updateStudentProfileSchema } from "./student-profile.schema";

const repository = new DrizzleStudentProfileRepository(db);

export const studentProfileRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/me", async (c) => {
    const data = await repository.findMine(c.get("authUser").id);
    return c.json({ data: data ?? null, complete: Boolean(data) });
  })
  .put("/me", zValidator("json", updateStudentProfileSchema), async (c) =>
    c.json({ data: await repository.upsert(c.get("authUser").id, c.req.valid("json")) }),
  );
