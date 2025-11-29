import { Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import crypto from "crypto";
import { isValidImageType } from "../utils/image.utils.js";
import { sendError } from "../utils/response.utils.js";

/**
 * Multer disk storage configuration
 * Stores files directly to disk to handle large 4K images efficiently
 * Files are saved to a temporary directory first, then moved to final location after processing
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Use temp directory for initial upload
    const tempDir = process.env.TEMP_UPLOAD_DIR || "/app/uploads/temp";
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique temporary filename to avoid conflicts
    const uniqueSuffix = `${Date.now()}-${crypto
      .randomBytes(6)
      .toString("hex")}`;
    const ext = path.extname(file.originalname);
    cb(null, `temp-${uniqueSuffix}${ext}`);
  },
});

/**
 * File filter to validate image types
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (isValidImageType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only JPG, PNG, and TIFF files are allowed.`
      )
    );
  }
};

/**
 * Base multer instance
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

/**
 * Wrapper middleware for single file upload with proper error handling
 * This is the modern approach recommended by multer documentation
 */
export function uploadSingleImage(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const multerSingle = upload.single("file");

  multerSingle(req, res, (err: any) => {
    // Handle multer-specific errors
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        sendError(res, "File size exceeds 50MB limit", 413, "FILE_TOO_LARGE");
        return;
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        sendError(res, "Unexpected file field", 400, "INVALID_FIELD");
        return;
      }
      sendError(res, err.message, 400, "UPLOAD_ERROR");
      return;
    }

    // Handle file filter errors (invalid file type)
    if (err) {
      sendError(res, err.message, 400, "INVALID_FILE_TYPE");
      return;
    }

    // Validate that a file was actually uploaded
    if (!req.file) {
      sendError(res, "No file was uploaded", 400, "NO_FILE");
      return;
    }

    // Success - proceed to next middleware
    next();
  });
}
