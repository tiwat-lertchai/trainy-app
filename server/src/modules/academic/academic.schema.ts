import { z } from "zod";

export const organizationIdParamSchema = z.object({ organizationId: z.string().uuid() });
export const facultyIdParamSchema = z.object({ facultyId: z.string().uuid() });
export const majorIdParamSchema = z.object({ majorId: z.string().uuid() });
export const studentUserIdParamSchema = z.object({ studentUserId: z.string().trim().min(1) });
export const createFacultySchema = z.object({ name: z.string().trim().min(2).max(200) });
export const createMajorSchema = z.object({ name: z.string().trim().min(2).max(200) });
export const setProgramChairSchema = z.object({ userId: z.string().trim().min(1) });
export const setAcademicRecordSchema = z.object({
  cumulativeGpa: z.coerce.number().min(0).max(4).optional(),
  lastTermGpa: z.coerce.number().min(0).max(4).optional(),
  meetsPrerequisite: z.boolean().optional(),
});
