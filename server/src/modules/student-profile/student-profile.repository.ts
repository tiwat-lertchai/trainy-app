import { eq } from "drizzle-orm";
import type { Database } from "../../db";
import { studentProfile } from "../../db/schema";
import type { StudentProfileInput } from "./student-profile.schema";

export type StudentProfileRecord = typeof studentProfile.$inferSelect;

export interface StudentProfileReadiness {
  isComplete(userId: string): Promise<boolean>;
}

export class DrizzleStudentProfileRepository implements StudentProfileReadiness {
  constructor(private readonly database: Database) {}

  findMine(userId: string) {
    return this.database.query.studentProfile.findFirst({
      where: eq(studentProfile.userId, userId),
    });
  }

  async isComplete(userId: string) {
    const profile = await this.findMine(userId);
    return Boolean(profile?.cumulativeGpa && profile.lastTermGpa);
  }

  async upsert(userId: string, input: StudentProfileInput) {
    const values = {
      ...input,
      cumulativeGpa: input.cumulativeGpa.toFixed(2),
      lastTermGpa: input.lastTermGpa.toFixed(2),
    };
    const [record] = await this.database
      .insert(studentProfile)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: studentProfile.userId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    if (!record) throw new Error("Database did not return the student profile");
    return record;
  }
}
