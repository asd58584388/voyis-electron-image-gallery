import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";
import { sendValidationError } from "../utils/response.utils.js";

/**
 * Validate request using express-validator
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidationError(res, errors.array());
      return;
    }

    next();
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const page = parseInt(req.query.page as string);
  const limit = parseInt(req.query.limit as string);

  if (!page || page < 1) {
    sendValidationError(res, [
      { msg: "Page must be greater than 0", param: "page" },
    ]);
    return;
  }

  if (!limit || limit < 1 || limit > 100) {
    sendValidationError(res, [
      { msg: "Limit must be between 1 and 100", param: "limit" },
    ]);
    return;
  }

  next();
}
