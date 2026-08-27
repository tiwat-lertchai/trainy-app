import type { ErrorHandler } from "hono";
import { AppError } from "../lib/app-error";

export const errorHandler: ErrorHandler = (error, c) => {
  const requestId = c.get("requestId");

  // AppError represents an expected failure that is safe to return to clients.
  if (error instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          requestId,
        },
      },
      error.statusCode,
    );
  }

  // Do not expose internal error details, but keep them in the server logs for
  // debugging together with the request that caused the failure.
  console.error({ error, requestId });

  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    },
    500,
  );
};
