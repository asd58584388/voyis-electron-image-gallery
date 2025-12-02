import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.utils.js";

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Error:", err);

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    sendError(res, "Database error occurred", 500, "DATABASE_ERROR");
    return;
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    sendError(res, err.message, 400, "VALIDATION_ERROR");
    return;
  }

  // Default error
  sendError(res, err.message || "Internal server error", 500, "INTERNAL_ERROR");
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.originalUrl} not found`, 404, "NOT_FOUND");
}
