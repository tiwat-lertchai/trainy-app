import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { db } from "../../db";
import { type AuthVariables, requireAuth } from "../../middleware/require-auth";
import { DrizzleAcademicRepository } from "./academic.repository";
import { createFacultySchema, createMajorSchema, facultyIdParamSchema, organizationIdParamSchema } from "./academic.schema";
import { AcademicService } from "./academic.service";

const service = new AcademicService(new DrizzleAcademicRepository(db));

export const academicRoute = new Hono<{ Variables: AuthVariables }>()
  .use("*", requireAuth)
  .get(
    "/:organizationId/faculties",
    zValidator("param", organizationIdParamSchema),
    async (c) => c.json({ data: await service.listFaculties(c.req.valid("param").organizationId) }),
  )
  .post(
    "/:organizationId/faculties",
    zValidator("param", organizationIdParamSchema),
    zValidator("json", createFacultySchema),
    async (c) =>
      c.json(
        {
          data: await service.createFaculty(
            c.get("authUser").id,
            c.req.valid("param").organizationId,
            c.req.valid("json").name,
          ),
        },
        201,
      ),
  )
  .get(
    "/faculties/:facultyId/majors",
    zValidator("param", facultyIdParamSchema),
    async (c) => c.json({ data: await service.listMajors(c.req.valid("param").facultyId) }),
  )
  .post(
    "/faculties/:facultyId/majors",
    zValidator("param", facultyIdParamSchema),
    zValidator("json", createMajorSchema),
    async (c) =>
      c.json(
        {
          data: await service.createMajor(
            c.get("authUser").id,
            c.req.valid("param").facultyId,
            c.req.valid("json").name,
          ),
        },
        201,
      ),
  );
