import { Router, Request, Response } from "express";
import { body, param } from "express-validator";
import path from "path";
import sharp from "sharp";
import fs from "fs/promises";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  validate,
  validatePagination,
} from "../middleware/validation.middleware.js";
import { uploadSingleImage } from "../middleware/upload.middleware.js";
import {
  sendSuccess,
  sendNotFound,
  sendError,
} from "../utils/response.utils.js";
import {
  calculateFileHash,
  generateUniqueFilename,
  generateThumbnailFromPath,
  getImageMetadataFromPath,
  deleteFileIfExists,
  moveFile,
} from "../utils/image.utils.js";

const router = Router();
const STORAGE_PATH = process.env.STORAGE_PATH || "/app/uploads";

/**
 * Create a single image resource
 * POST /api/images
 */
router.post(
  "/",
  uploadSingleImage,
  validate([
    body("folder_name")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage(
        "folder_name must contain only alphanumeric characters, hyphens, and underscores"
      ),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file!;
    const folderName = (req.body.folder_name as string) || "default";
    const tempFilePath = file.path; // Temp file location from multer disk storage
    console.log("uploaded file", file);
    try {
      // Step 1: Validate image integrity FIRST (fail fast for corrupted images)
      // Extract metadata from disk - if this fails, image is corrupted
      let metadata;
      try {
        metadata = await getImageMetadataFromPath(tempFilePath);
        console.log("file metadata", metadata);
      } catch (metadataError) {
        await deleteFileIfExists(tempFilePath);
        sendError(res, "Corrupted or invalid image file", 400, "INVALID_IMAGE");
        return;
      }

      // Step 2: Calculate file hash for duplicate detection
      const fileHash = await calculateFileHash(tempFilePath);

      // Step 3: Check for duplicate
      const existingImage = await prisma.image.findFirst({
        where: { filehash: fileHash },
      });

      if (existingImage) {
        // Clean up temp file before returning error
        await deleteFileIfExists(tempFilePath);
        sendError(res, "Image already exists", 409, "DUPLICATE_IMAGE", {
          existingImageId: existingImage.id,
        });
        return;
      }

      // Generate unique filename and paths
      const uniqueFilename = generateUniqueFilename(
        file.originalname,
        fileHash
      );
      const finalImagePath = path.join(
        STORAGE_PATH,
        folderName,
        uniqueFilename
      );
      // Change thumbnail extension to .webp
      const thumbnailFilename = `thumb_${uniqueFilename.replace(
        /\.[^/.]+$/,
        ""
      )}.webp`;
      const thumbnailPath = path.join(
        STORAGE_PATH,
        folderName,
        "thumbnails",
        thumbnailFilename
      );

      // Generate and save thumbnail from disk (memory-efficient)
      try {
        await generateThumbnailFromPath(tempFilePath, thumbnailPath);
      } catch (thumbnailError) {
        await deleteFileIfExists(tempFilePath);
        throw new Error(
          `Failed to generate thumbnail: ${
            thumbnailError instanceof Error
              ? thumbnailError.message
              : "Unknown error"
          }`
        );
      }

      // Move file from temp to final location
      try {
        await moveFile(tempFilePath, finalImagePath);
      } catch (moveError) {
        // Clean up thumbnail if move fails
        await deleteFileIfExists(thumbnailPath);
        await deleteFileIfExists(tempFilePath);
        throw new Error(
          `Failed to move file: ${
            moveError instanceof Error ? moveError.message : "Unknown error"
          }`
        );
      }

      // Prepare metadata payload (image dimensions, format, EXIF, etc.)
      const metadataPayload = {
        ...metadata,
        originalName: file.originalname,
      };

      // Create database record
      const image = await prisma.image.create({
        data: {
          filename: uniqueFilename,
          path: finalImagePath,
          thumbnail_path: thumbnailPath,
          folder_name: folderName,
          size: file.size,
          mimetype: file.mimetype,
          filehash: fileHash,
          metadata: metadataPayload,
        },
      });

      sendSuccess(res, image, 201);
    } catch (error) {
      console.error("Error uploading image:", error);
      // Ensure temp file is cleaned up on any error
      await deleteFileIfExists(tempFilePath);
      sendError(
        res,
        error instanceof Error ? error.message : "Failed to upload image",
        500,
        "UPLOAD_FAILED"
      );
    }
  })
);

/**
 * Get all images with pagination and filters
 * GET /api/images
 */
router.get(
  "/",
  validatePagination,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string);
    const limit = parseInt(req.query.limit as string);
    const folderName = req.query.folder_name as string;
    const mimetype = req.query.mimetype as string;
    const includeDeleted = req.query.include_deleted === "true";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (!includeDeleted) {
      where.deleted_at = null;
    }

    if (folderName) {
      where.folder_name = folderName;
    }

    if (mimetype) {
      where.mimetype = mimetype;
    }

    const [images, total] = await Promise.all([
      prisma.image.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: "desc" },
      }),
      prisma.image.count({ where }),
    ]);

    sendSuccess(res, images, 200, {
      total,
      page,
      limit,
    });
  })
);

/**
 * Get image content (streams the file)
 * GET /api/images/:id
 */
router.get(
  "/:id",
  validate([param("id").isUUID()]),
  asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const image = await prisma.image.findUnique({
      where: { id: req.params.id! },
    });

    if (!image) {
      sendNotFound(res, "Image");
      return;
    }

    const filePath = image.path;
    console.log("filePath", filePath);

    // If image is TIFF, convert to WebP for browser compatibility
    if (image.mimetype === "image/tiff") {
      const previewFilename = `preview_${path.basename(
        filePath,
        path.extname(filePath)
      )}.webp`;
      const previewDir = path.join(path.dirname(filePath), "previews");
      const previewPath = path.join(previewDir, previewFilename);

      // Add caching headers
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      try {
        // Check if cached preview exists
        try {
          const importFs = await import("fs/promises");
          await importFs.default.access(previewPath);

          // Serve cached file
          res.setHeader("Content-Type", "image/webp");
          res.sendFile(previewPath);
          return;
        } catch {
          // Preview doesn't exist, continue to generate
        }

        res.set("Content-Type", "image/webp");

        // Ensure preview directory exists
        const importFs = await import("fs/promises");
        try {
          await importFs.default.mkdir(previewDir, { recursive: true });
        } catch (e) {
          // Ignore error if directory already exists
        }

        // Generate preview, save to file, and stream to response
        const pipeline = sharp(filePath).webp({ quality: 100 });

        // Save to file in background (fire and forget essentially, or we can wait)
        // Ideally we want to serve it as fast as possible.
        // We can pipe to response AND file, but piping to file is a Writable stream.
        // A Cloneable stream is needed.

        // Better approach for first load: just pipe to response.
        // But we want to cache it.

        await pipeline.toFile(previewPath);
        res.sendFile(previewPath);
      } catch (error) {
        console.error("Error processing/caching TIFF preview:", error);
        // Fallback: try to stream directly if file writing failed
        try {
          const fallbackPipeline = sharp(filePath).webp({ quality: 100 });
          fallbackPipeline.pipe(res);
        } catch (fallbackError) {
          if (!res.headersSent) {
            sendError(res, "Internal image processing error", 500);
          }
        }
      }
    } else {
      // For standard web images (JPG, PNG), stream directly
      // Ensure we set the content type
      res.setHeader("Content-Type", image.mimetype);
      // Add caching headers
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      // Check if file exists before sending
      try {
        // Use path.resolve to ensure absolute path
        const absolutePath = path.resolve(filePath);
        res.sendFile(absolutePath, (err) => {
          if (err) {
            console.error("Error sending file:", err);
            if (!res.headersSent) {
              sendError(res, "Failed to retrieve image file", 500);
            }
          }
        });
      } catch (error) {
        console.error("Error resolving file path:", error);
        sendError(res, "Invalid file path", 500);
      }
    }
  })
);

/**
 * Update image metadata
 * PATCH /api/images/:id
 */
router.patch(
  "/:id",
  validate([
    param("id").isUUID(),
    body("metadata").optional().isObject(),
    body("folder_name").optional().isString(),
  ]),
  asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { metadata, folder_name } = req.body;

    const existingImage = await prisma.image.findUnique({
      where: { id: req.params.id! },
    });

    if (!existingImage) {
      sendNotFound(res, "Image");
      return;
    }

    const updateData: any = {};

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    if (folder_name !== undefined) {
      updateData.folder_name = folder_name;
    }

    const image = await prisma.image.update({
      where: { id: req.params.id! },
      data: updateData,
    });

    sendSuccess(res, image);
  })
);

/**
 * Crop an image and save as new image
 * POST /api/images/:id/crop
 */
router.post(
  "/:id/crop",
  validate([
    param("id").isUUID(),
    body("x").isNumeric(),
    body("y").isNumeric(),
    body("width").isNumeric(),
    body("height").isNumeric(),
  ]),
  asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { x, y, width, height } = req.body;
    const imageId = req.params.id;

    const originalImage = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!originalImage) {
      sendNotFound(res, "Image");
      return;
    }

    const folderName = originalImage.folder_name || "default";

    // Generate filename for cropped image using standard format (hash + timestamp)
    // We'll calculate hash AFTER cropping, but need a temp filename first
    const tempFilename = `temp_crop_${Date.now()}${path.extname(
      originalImage.filename
    )}`;
    const tempPath = path.join(STORAGE_PATH, "temp", tempFilename);

    // Ensure temp dir exists
    const importFs = await import("fs/promises");
    try {
      await importFs.default.mkdir(path.dirname(tempPath), { recursive: true });
    } catch (e) {}

    try {
      // Perform crop to temp location
      await sharp(originalImage.path)
        .extract({
          left: Math.round(x),
          top: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        })
        .toFile(tempPath);

      // Calculate hash of the new cropped image
      const newFileHash = await calculateFileHash(tempPath);

      // Generate standard unique filename based on hash
      const originalMetadata = originalImage.metadata as Record<
        string,
        any
      > | null;
      const baseOriginalName =
        originalMetadata?.originalName || originalImage.filename;
      const croppedOriginalName = `cropped_${baseOriginalName}`;

      const uniqueFilename = generateUniqueFilename(
        croppedOriginalName,
        newFileHash
      );

      const finalImagePath = path.join(
        STORAGE_PATH,
        folderName,
        uniqueFilename
      );
      const thumbnailFilename = `thumb_${uniqueFilename.replace(
        /\.[^/.]+$/,
        ""
      )}.webp`;
      const thumbnailPath = path.join(
        STORAGE_PATH,
        folderName,
        "thumbnails",
        thumbnailFilename
      );

      // Move file to final location
      await moveFile(tempPath, finalImagePath);

      // Generate thumbnail for cropped image
      await generateThumbnailFromPath(finalImagePath, thumbnailPath);

      // Get new file stats
      const stats = await fs.stat(finalImagePath);
      const metadata = await getImageMetadataFromPath(finalImagePath);

      const metadataPayload = {
        ...metadata,
        originalName: croppedOriginalName,
      };

      // Create new database record
      const newImage = await prisma.image.create({
        data: {
          filename: uniqueFilename,
          path: finalImagePath,
          thumbnail_path: thumbnailPath,
          folder_name: folderName,
          size: stats.size,
          mimetype: originalImage.mimetype,
          filehash: newFileHash,
          metadata: metadataPayload,
        },
      });

      sendSuccess(res, newImage, 201);
    } catch (error) {
      console.error("Error cropping image:", error);
      // Cleanup files if they were created
      await deleteFileIfExists(tempPath);
      // finalImagePath and thumbnailPath might not exist yet or are handled by moveFile/generateThumbnail

      sendError(
        res,
        error instanceof Error ? error.message : "Failed to crop image",
        500,
        "CROP_FAILED"
      );
    }
  })
);

/**
 * Soft delete image (mark as deleted without removing files)
 * DELETE /api/images/:id
 */
router.delete(
  "/:id",
  validate([param("id").isUUID()]),
  asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const existingImage = await prisma.image.findUnique({
      where: { id: req.params.id! },
    });

    if (!existingImage) {
      sendNotFound(res, "Image");
      return;
    }

    // Check if already deleted
    if (existingImage.deleted_at) {
      sendError(res, "Image already deleted", 400, "ALREADY_DELETED");
      return;
    }

    // Soft delete - just mark as deleted, keep files intact
    const deletedImage = await prisma.image.update({
      where: { id: req.params.id! },
      data: { deleted_at: new Date() },
    });

    sendSuccess(res, {
      message: "Image deleted successfully",
      id: deletedImage.id,
      deleted_at: deletedImage.deleted_at,
    });
  })
);

/**
 * Batch delete images
 * DELETE /api/images
 */
router.delete(
  "/",
  validate([body("ids").isArray().notEmpty(), body("ids.*").isUUID()]),
  asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body;

    const result = await prisma.image.updateMany({
      where: {
        id: { in: ids },
        deleted_at: null,
      },
      data: { deleted_at: new Date() },
    });

    sendSuccess(res, {
      message: `${result.count} images deleted successfully`,
      count: result.count,
    });
  })
);

export default router;
