import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: ContentfulStatusCode = 500,
    public readonly code = "INTERNAL_SERVER_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}
