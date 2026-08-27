import { desc, eq } from "drizzle-orm";
import type { Database } from "../../db";
import { placement, placementDocument } from "../../db/schema";

export type DocumentRecord = typeof placementDocument.$inferSelect;
export type DocumentPlacement = Pick<
  typeof placement.$inferSelect,
  "id" | "studentUserId" | "advisorUserId" | "supervisorUserId" | "status"
>;
export interface DocumentRepository {
  findPlacement(id: string): Promise<DocumentPlacement | undefined>;
  findDocument(id: string): Promise<DocumentRecord | undefined>;
  create(
    input: Pick<
      DocumentRecord,
      | "placementId"
      | "studentUserId"
      | "type"
      | "fileName"
      | "storageKey"
      | "mimeType"
      | "sizeBytes"
    >,
  ): Promise<DocumentRecord>;
  review(
    id: string,
    changes: Pick<
      DocumentRecord,
      "status" | "reviewerUserId" | "feedback" | "reviewedAt"
    >,
  ): Promise<DocumentRecord>;
  list(placementId: string): Promise<DocumentRecord[]>;
}
export class DrizzleDocumentRepository implements DocumentRepository {
  constructor(private readonly database: Database) {}
  findPlacement(id: string) {
    return this.database.query.placement.findFirst({
      columns: {
        id: true,
        studentUserId: true,
        advisorUserId: true,
        supervisorUserId: true,
        status: true,
      },
      where: eq(placement.id, id),
    });
  }
  findDocument(id: string) {
    return this.database.query.placementDocument.findFirst({
      where: eq(placementDocument.id, id),
    });
  }
  async create(input: Parameters<DocumentRepository["create"]>[0]) {
    const [record] = await this.database
      .insert(placementDocument)
      .values(input)
      .returning();
    if (!record) throw new Error("Database did not return the document");
    return record;
  }
  async review(
    id: string,
    changes: Parameters<DocumentRepository["review"]>[1],
  ) {
    const [record] = await this.database
      .update(placementDocument)
      .set(changes)
      .where(eq(placementDocument.id, id))
      .returning();
    if (!record)
      throw new Error("Database did not return the reviewed document");
    return record;
  }
  list(placementId: string) {
    return this.database.query.placementDocument.findMany({
      where: eq(placementDocument.placementId, placementId),
      orderBy: [desc(placementDocument.createdAt)],
    });
  }
}
