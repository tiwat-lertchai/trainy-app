import { createFileRoute } from "@tanstack/react-router";
import { DocumentPage } from "@/features/documents/document-page";
export const Route = createFileRoute("/app/documents")({ component: DocumentPage });
