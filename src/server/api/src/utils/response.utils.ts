import { Response } from "express";

/**
 * Standard API response structure
 */
type ValidationErrorItem = Record<string, unknown>;

type ErrorDetails = string | ValidationErrorItem | ValidationErrorItem[];

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: ErrorDetails;
  };
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: string;
  };
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  metadata?: Partial<ApiResponse["metadata"]>
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: ErrorDetails
): void {
  const errorPayload: NonNullable<ApiResponse["error"]> = {
    message,
  };

  if (code !== undefined) {
    errorPayload.code = code;
  }

  if (details !== undefined) {
    errorPayload.details = details;
  }

  const response: ApiResponse = {
    success: false,
    error: errorPayload,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
}

/**
 * Send validation error response
 */
export function sendValidationError(
  res: Response,
  errors: ValidationErrorItem[]
): void {
  sendError(res, "Validation failed", 400, "VALIDATION_ERROR", errors);
}

/**
 * Send not found error response
 */
export function sendNotFound(
  res: Response,
  resource: string = "Resource"
): void {
  sendError(res, `${resource} not found`, 404, "NOT_FOUND");
}

/**
 * Send conflict error response
 */
export function sendConflict(res: Response, message: string): void {
  sendError(res, message, 409, "CONFLICT");
}

/**
 * Send unauthorized error response
 */
export function sendUnauthorized(
  res: Response,
  message: string = "Unauthorized"
): void {
  sendError(res, message, 401, "UNAUTHORIZED");
}
