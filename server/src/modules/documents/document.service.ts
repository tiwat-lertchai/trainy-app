import { AppError } from "../../lib/app-error";
import type { DocumentRepository } from "./document.repository";
import type { documentTypes } from "./document.schema";

export class DocumentService {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly now = () => new Date(),
  ) {}
  async submit(input: {
    actorUserId: string;
    placementId: string;
    type: (typeof documentTypes)[number];
    fileName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
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
    return this.repository.create({
      ...input,
      studentUserId: input.actorUserId,
    });
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
    return this.repository.review(document.id, {
      status: decision,
      reviewerUserId: actorUserId,
      feedback: feedback ?? null,
      reviewedAt: this.now(),
    });
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
