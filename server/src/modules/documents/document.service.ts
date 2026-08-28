import { AppError } from "../../lib/app-error";
import { type DomainNotifier, noOpNotifier } from "../../lib/domain-notifier";
import type { DocumentRepository } from "./document.repository";
import type { documentTypes } from "./document.schema";
import type { DocumentStorage } from "./document-storage";

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly now = () => new Date(),
    private readonly notifier: DomainNotifier = noOpNotifier,
    private readonly storage?: DocumentStorage,
  ) {}
  async upload(input: {
    actorUserId: string;
    placementId: string;
    type: (typeof documentTypes)[number];
    fileName: string;
    mimeType: string;
    bytes: Uint8Array;
  }) {
    const placement = await this.requirePlacement(input.placementId);
    if (placement.studentUserId !== input.actorUserId)
      throw new AppError("Placement was not found", 404, "PLACEMENT_NOT_FOUND");
    if (
      !(["pending", "active"] as const).includes(
        placement.status as "pending" | "active",
      )
    )
      throw new AppError(
        "Placement no longer accepts documents",
        409,
        "DOCUMENT_SUBMISSION_CLOSED",
      );
    if (!hasExpectedSignature(input.mimeType, input.bytes))
      throw new AppError("File content does not match its MIME type", 422, "DOCUMENT_CONTENT_INVALID");
    if (!this.storage) throw new Error("Document storage is not configured");
    const storageKey = await this.storage.save(input);
    try {
      return await this.repository.create({
        placementId: input.placementId,
        studentUserId: input.actorUserId,
        type: input.type,
        fileName: input.fileName,
        storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.bytes.byteLength,
      });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async download(actorUserId: string, documentId: string) {
    const document = await this.requireDocument(documentId);
    const placement = await this.requirePlacement(document.placementId);
    if (![placement.studentUserId, placement.advisorUserId, placement.supervisorUserId].includes(actorUserId))
      throw new AppError("Placement access is required", 403, "PLACEMENT_ACCESS_REQUIRED");
    if (!this.storage) throw new Error("Document storage is not configured");
    try {
      return { document, bytes: await this.storage.read(document.storageKey) };
    } catch {
      throw new AppError("Document file was not found", 404, "DOCUMENT_FILE_NOT_FOUND");
    }
  }
  async review(
    actorUserId: string,
    documentId: string,
    decision: "approved" | "rejected",
    feedback?: string,
  ) {
    const document = await this.requireDocument(documentId);
    const placement = await this.requirePlacement(document.placementId);
    if (
      ![placement.advisorUserId, placement.supervisorUserId].includes(
        actorUserId,
      )
    )
      throw new AppError(
        "Assigned reviewer access is required",
        403,
        "DOCUMENT_REVIEWER_REQUIRED",
      );
    if (document.status !== "submitted")
      throw new AppError(
        "Document has already been reviewed",
        409,
        "DOCUMENT_ALREADY_REVIEWED",
      );
    if (decision === "rejected" && !feedback?.trim())
      throw new AppError(
        "Feedback is required",
        422,
        "DOCUMENT_FEEDBACK_REQUIRED",
      );
    const reviewed = await this.repository.review(document.id, {
      status: decision,
      reviewerUserId: actorUserId,
      feedback: feedback ?? null,
      reviewedAt: this.now(),
    });
    await this.notifier.notify({
      userId: document.studentUserId,
      type: "document_reviewed",
      title: "Document reviewed",
      message:
        decision === "approved"
          ? "Your document was approved."
          : "Your document was rejected.",
      entityType: "placement_document",
      entityId: document.id,
    });
    return reviewed;
  }
  async list(actorUserId: string, placementId: string) {
    const placement = await this.requirePlacement(placementId);
    if (
      ![
        placement.studentUserId,
        placement.advisorUserId,
        placement.supervisorUserId,
      ].includes(actorUserId)
    )
      throw new AppError(
        "Placement access is required",
        403,
        "PLACEMENT_ACCESS_REQUIRED",
      );
    return this.repository.list(placementId);
  }
  private async requirePlacement(id: string) {
    const record = await this.repository.findPlacement(id);
    if (!record)
      throw new AppError("Placement was not found", 404, "PLACEMENT_NOT_FOUND");
    return record;
  }
  private async requireDocument(id: string) {
    const record = await this.repository.findDocument(id);
    if (!record)
      throw new AppError("Document was not found", 404, "DOCUMENT_NOT_FOUND");
    return record;
  }
}

function hasExpectedSignature(mimeType: string, bytes: Uint8Array) {
  if (mimeType === "application/pdf") return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  return false;
}
