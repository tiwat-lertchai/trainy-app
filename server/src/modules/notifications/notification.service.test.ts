import { describe, expect, test } from "bun:test";
import type { NotificationRecord, NotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";
describe("NotificationService", () => {
  test("lists only the signed-in user's notifications", async () => {
    const r = new MemoryNotificationRepository();
    await r.create(input("user"));
    await r.create(input("other"));
    expect(await new NotificationService(r).list("user")).toHaveLength(1);
  });
  test("cannot mark another user's notification read", async () => {
    const r = new MemoryNotificationRepository();
    const n = await r.create(input("other"));
    expect(new NotificationService(r).markRead("user", n.id)).rejects.toMatchObject({
      code: "NOTIFICATION_NOT_FOUND",
    });
  });
  test("marks an unread notification exactly once", async () => {
    const r = new MemoryNotificationRepository();
    const n = await r.create(input("user"));
    const s = new NotificationService(r, () => new Date("2026-08-27"));
    expect((await s.markRead("user", n.id)).readAt).toEqual(new Date("2026-08-27"));
    expect(s.markRead("user", n.id)).rejects.toMatchObject({
      code: "NOTIFICATION_NOT_FOUND",
    });
  });
});
class MemoryNotificationRepository implements NotificationRepository {
  records: NotificationRecord[] = [];
  async create(value: Parameters<NotificationRepository["create"]>[0]) {
    const r: NotificationRecord = {
      id: `notification-${this.records.length}`,
      readAt: null,
      createdAt: new Date(),
      ...value,
    };
    this.records.push(r);
    return r;
  }
  async list(userId: string) {
    return this.records.filter((r) => r.userId === userId);
  }
  async markRead(id: string, userId: string, at: Date) {
    const r = this.records.find((n) => n.id === id && n.userId === userId && !n.readAt);
    if (r) r.readAt = at;
    return r;
  }
}
function input(userId: string) {
  return {
    userId,
    type: "workflow",
    title: "Status updated",
    message: "A workflow item changed.",
    entityType: null,
    entityId: null,
  };
}
