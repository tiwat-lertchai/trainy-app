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
    return Boolean(await this.findMine(userId));
  }

  async upsert(userId: string, input: StudentProfileInput) {
    const [record] = await this.database
      .insert(studentProfile)
      .values({ userId, ...input })
      .onConflictDoUpdate({
        target: studentProfile.userId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    if (!record) throw new Error("Database did not return the student profile");
    return record;
  }
}
