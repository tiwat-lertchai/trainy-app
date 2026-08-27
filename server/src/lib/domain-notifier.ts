export type DomainNotification = {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
};

export interface DomainNotifier {
  notify(input: DomainNotification): Promise<unknown>;
}

export const noOpNotifier: DomainNotifier = {
  async notify() {},
};
