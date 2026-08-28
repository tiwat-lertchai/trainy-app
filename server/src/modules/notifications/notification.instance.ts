import { db } from "../../db";
import { DrizzleNotificationRepository } from "./notification.repository";
import { NotificationService } from "./notification.service";
import type { DomainNotifier } from "../../lib/domain-notifier";

export const notificationService = new NotificationService(new DrizzleNotificationRepository(db));

export const domainNotifier: DomainNotifier = {
  async notify(input) {
    try {
      await notificationService.notify(input);
    } catch (error) {
      // A notification must never turn an already committed domain mutation
      // into a misleading API failure. Monitoring should alert on this log.
      console.error("Failed to create domain notification", error);
    }
  },
};
