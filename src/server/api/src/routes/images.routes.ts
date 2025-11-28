import { Router, Request, Response } from "express";
import { body, param } from "express-validator";
import path from "path";
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
    const storagePath = process.env.STORAGE_PATH || "/app/uploads";
    const tempFilePath = file.path; // Temp file location from multer disk storage

    try {
      // Step 1: Validate image integrity FIRST (fail fast for corrupted images)
      // Extract metadata from disk - if this fails, image is corrupted
      let metadata;
      try {
        metadata = await getImageMetadataFromPath(tempFilePath);
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
      const finalImagePath = path.join(storagePath, folderName, uniqueFilename);
      const thumbnailFilename = `thumb_${uniqueFilename}`;
      const thumbnailPath = path.join(
        storagePath,
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
          `Failed to generate thumbnail: ${thumbnailError instanceof Error ? thumbnailError.message : "Unknown error"}`
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
          `Failed to move file: ${moveError instanceof Error ? moveError.message : "Unknown error"}`
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
          metadata: metadataPayload as any,
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
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
        orderBy: { created_at: "desc" },
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
 * Get image by ID
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

    sendSuccess(res, image);
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
 * Permanently delete image and files
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

    // Delete files
    await deleteFileIfExists(existingImage.path);
    if (existingImage.thumbnail_path) {
      await deleteFileIfExists(existingImage.thumbnail_path);
    }

    // Delete from database
    await prisma.image.delete({
      where: { id: req.params.id! },
    });

    sendSuccess(res, { message: "Image permanently deleted" });
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
