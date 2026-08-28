import { describe, expect, test } from "bun:test";
import type { DocumentPlacement, DocumentRecord, DocumentRepository } from "./document.repository";
import { DocumentService } from "./document.service";
import type { DocumentStorage } from "./document-storage";

describe("DocumentService", () => {
  test("lets only the placement student upload a file", async () => {
    const repo = new MemoryDocumentRepository();
    expect(await upload(repo, "student")).toMatchObject({
      status: "submitted",
    });
    expect(upload(new MemoryDocumentRepository(), "outsider")).rejects.toMatchObject({
      code: "PLACEMENT_NOT_FOUND",
    });
  });
  test("rejects file content that does not match the declared MIME type", async () => {
    const repo = new MemoryDocumentRepository();
    expect(
      new DocumentService(repo, () => new Date(), undefined, new MemoryStorage()).upload({
        actorUserId: "student",
        placementId: "placement",
        type: "consent",
        fileName: "fake.pdf",
        mimeType: "application/pdf",
        bytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({ code: "DOCUMENT_CONTENT_INVALID" });
  });
  test("downloads only for placement participants", async () => {
    const repo = new MemoryDocumentRepository();
    repo.document = record();
    const service = new DocumentService(repo, () => new Date(), undefined, new MemoryStorage());
    expect((await service.download("student", "document")).bytes).toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(service.download("outsider", "document")).rejects.toMatchObject({
      code: "PLACEMENT_ACCESS_REQUIRED",
    });
  });
  test("allows only assigned reviewers", async () => {
    const repo = new MemoryDocumentRepository();
    repo.document = record();
    expect(
      new DocumentService(repo).review("outsider", "document", "approved"),
    ).rejects.toMatchObject({ code: "DOCUMENT_REVIEWER_REQUIRED" });
  });
  test("requires rejection feedback", async () => {
    const repo = new MemoryDocumentRepository();
    repo.document = record();
    expect(
      new DocumentService(repo).review("advisor", "document", "rejected"),
    ).rejects.toMatchObject({ code: "DOCUMENT_FEEDBACK_REQUIRED" });
  });
  test("prevents reviewing a terminal document twice", async () => {
    const repo = new MemoryDocumentRepository();
    repo.document = record({ status: "approved" });
    expect(
      new DocumentService(repo).review("advisor", "document", "rejected", "No longer valid"),
    ).rejects.toMatchObject({ code: "DOCUMENT_ALREADY_REVIEWED" });
  });
  test("notifies the student after review", async () => {
    const repo = new MemoryDocumentRepository();
    repo.document = record();
    const notifications: unknown[] = [];
    await new DocumentService(repo, () => new Date(), {
      async notify(input) {
        notifications.push(input);
      },
    }).review("advisor", "document", "approved");
    expect(notifications).toHaveLength(1);
  });
});
class MemoryDocumentRepository implements DocumentRepository {
  placement: DocumentPlacement = {
    id: "placement",
    studentUserId: "student",
    advisorUserId: "advisor",
    supervisorUserId: "supervisor",
    status: "active",
  };
  document?: DocumentRecord;
  async findPlacement(id: string) {
    return id === "placement" ? this.placement : undefined;
  }
  async findDocument(id: string) {
    return this.document?.id === id ? this.document : undefined;
  }
  async create(input: Parameters<DocumentRepository["create"]>[0]) {
    this.document = record(input);
    return this.document;
  }
  async review(id: string, changes: Parameters<DocumentRepository["review"]>[1]) {
    if (!this.document || id !== this.document.id) throw new Error("Missing document");
    Object.assign(this.document, changes);
    return this.document;
  }
  async list(id: string) {
    return this.document?.placementId === id ? [this.document] : [];
  }
}
class MemoryStorage implements DocumentStorage {
  async save() {
    return "placements/placement/file.pdf";
  }
  async read() {
    return new Uint8Array([1, 2, 3]);
  }
  async remove() {}
}
function upload(repo: DocumentRepository, actorUserId: string) {
  return new DocumentService(repo, () => new Date(), undefined, new MemoryStorage()).upload({
    actorUserId,
    placementId: "placement",
    type: "consent",
    fileName: "consent.pdf",
    mimeType: "application/pdf",
    bytes: new TextEncoder().encode("%PDF-test"),
  });
}
function record(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  const now = new Date();
  return {
    id: "document",
    placementId: "placement",
    studentUserId: "student",
    type: "consent",
    fileName: "consent.pdf",
    storageKey: "placements/placement/consent-123456.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    status: "submitted",
    reviewerUserId: null,
    feedback: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
