import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleOnboardingRepository } from "./onboarding.repository";
import { onboardingIdParamSchema, reviewOnboardingSchema, submitOnboardingSchema } from "./onboarding.schema";
import { OnboardingService } from "./onboarding.service";

const service = new OnboardingService(new DrizzleOnboardingRepository(db));

export const onboardingRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get("/me", async (c) => c.json({ data: await service.getMine(c.get("authUser").id) ?? null }))
  .get("/organizations", async (c) => c.json({ data: await service.listOrganizations() }))
  .post("/", zValidator("json", submitOnboardingSchema), async (c) => c.json({ data: await service.submit(c.get("authUser").id, c.req.valid("json")) }, 201))
  .get("/reviews", async (c) => c.json({ data: await service.listReviews(c.get("authUser").id) }))
  .post("/:onboardingId/review", zValidator("param", onboardingIdParamSchema), zValidator("json", reviewOnboardingSchema), async (c) => c.json({ data: await service.review(c.get("authUser").id, c.req.valid("param").onboardingId, c.req.valid("json")) }));
