import { z } from "zod";

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const updateStudentProfileSchema = z.object({
  dateOfBirth: z.string().date(),
  gender: z.enum(["female", "male", "non_binary", "prefer_not_to_say"]),
  address: requiredText(1000),
  cumulativeGpa: z.number().min(0).max(4),
  lastTermGpa: z.number().min(0).max(4),
  emergencyContactName: requiredText(200),
  emergencyContactRelationship: requiredText(100),
  emergencyContactPhone: z.string().trim().min(8).max(30),
  bloodType: z.enum(["A", "B", "AB", "O", "unknown"]),
  medicalConditions: requiredText(1000),
  allergies: requiredText(1000),
  medications: requiredText(1000),
  accessibilityNeeds: requiredText(1000),
});

export type StudentProfileInput = z.infer<typeof updateStudentProfileSchema>;
