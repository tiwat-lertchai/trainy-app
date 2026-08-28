import { and, desc, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db";
import { notification } from "../../db/schema";
export type NotificationRecord = typeof notification.$inferSelect;
export interface NotificationRepository {
  create(
    input: Pick<
      NotificationRecord,
      "userId" | "type" | "title" | "message" | "entityType" | "entityId"
    >,
  ): Promise<NotificationRecord>;
  list(userId: string): Promise<NotificationRecord[]>;
  markRead(id: string, userId: string, at: Date): Promise<NotificationRecord | undefined>;
}
export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private readonly database: Database) {}
  async create(input: Parameters<NotificationRepository["create"]>[0]) {
    const [r] = await this.database.insert(notification).values(input).returning();
    if (!r) throw new Error("Database did not return notification");
    return r;
  }
  list(userId: string) {
    return this.database.query.notification.findMany({
      where: eq(notification.userId, userId),
      orderBy: [desc(notification.createdAt)],
      limit: 100,
    });
  }
  async markRead(id: string, userId: string, at: Date) {
    const [r] = await this.database
      .update(notification)
      .set({ readAt: at })
      .where(
        and(eq(notification.id, id), eq(notification.userId, userId), isNull(notification.readAt)),
      )
      .returning();
    return r;
  }
}
