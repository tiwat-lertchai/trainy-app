import { AppError } from "../../lib/app-error";
import type { NotificationRepository } from "./notification.repository";
export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly now = () => new Date(),
  ) {}
  notify(input: Parameters<NotificationRepository["create"]>[0]) {
    return this.repository.create(input);
  }
  list(userId: string) {
    return this.repository.list(userId);
  }
  async markRead(userId: string, id: string) {
    const r = await this.repository.markRead(id, userId, this.now());
    if (!r) throw new AppError("Unread notification was not found", 404, "NOTIFICATION_NOT_FOUND");
    return r;
  }
}
