import { describe, expect, test } from "bun:test";
import { updateStudentProfileSchema } from "./student-profile.schema";

const completeProfile = {
  dateOfBirth: "2003-05-17",
  gender: "prefer_not_to_say",
  address: "123 Bangkok, Thailand",
  cumulativeGpa: 3.42,
  lastTermGpa: 3.75,
  emergencyContactName: "Emergency Contact",
  emergencyContactRelationship: "Parent",
  emergencyContactPhone: "0812345678",
  bloodType: "unknown",
  medicalConditions: "None",
  allergies: "None",
  medications: "None",
  accessibilityNeeds: "None",
};

describe("updateStudentProfileSchema", () => {
  test("accepts a complete profile including explicit no-condition answers", () => {
    expect(updateStudentProfileSchema.safeParse(completeProfile).success).toBe(true);
  });

  test("rejects missing health answers and malformed dates", () => {
    expect(
      updateStudentProfileSchema.safeParse({
        ...completeProfile,
        dateOfBirth: "17/05/2003",
        allergies: "",
      }).success,
    ).toBe(false);
  });

  test("accepts only GPA values on the 0.00 to 4.00 scale", () => {
    expect(updateStudentProfileSchema.safeParse(completeProfile).success).toBe(true);
    expect(
      updateStudentProfileSchema.safeParse({ ...completeProfile, cumulativeGpa: 4.01 }).success,
    ).toBe(false);
    expect(
      updateStudentProfileSchema.safeParse({ ...completeProfile, lastTermGpa: -0.01 }).success,
    ).toBe(false);
    expect(
      updateStudentProfileSchema.safeParse({ ...completeProfile, cumulativeGpa: "" }).success,
    ).toBe(false);
  });
});
