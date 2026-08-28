import { z } from "zod";

export const organizationIdParamSchema = z.object({ organizationId: z.string().uuid() });
export const facultyIdParamSchema = z.object({ facultyId: z.string().uuid() });
export const createFacultySchema = z.object({ name: z.string().trim().min(2).max(200) });
export const createMajorSchema = z.object({ name: z.string().trim().min(2).max(200) });
