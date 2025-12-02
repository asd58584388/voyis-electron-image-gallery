import { Router, Request, Response } from "express";
import type { Prisma } from "../../generated/prisma/client.js";
import type {
  EditableExifField,
  EditableExifInput,
} from "../../../../shared/exif.js";
import { EDITABLE_EXIF_FIELDS } from "../constants/exif.constants.js";
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
  getExifDataFromPath,
  writeExifDataToPath,
  deleteFileIfExists,
  moveFile,
} from "../utils/image.utils.js";

const router = Router();
const STORAGE_PATH = process.env.STORAGE_PATH || "/app/uploads";

const sanitizeEditableExifInput = (
  payload: Record<string, unknown>
): Partial<EditableExifInput> => {
  const result: Record<string, string | null> = {};

  const numericFields: EditableExifField[] = [
    "iso",
    "fNumber",
    "gpsLatitude",
    "gpsLongitude",
  ];

  for (const field of EDITABLE_EXIF_FIELDS) {
    if (!(field in payload)) continue;
    const rawValue = payload[field];
    if (rawValue === undefined) continue;

    if (rawValue === null || rawValue === "") {
      result[field] = null;
      continue;
    }

    if (numericFields.includes(field)) {
      const parsed = Number(rawValue);
      if (Number.isFinite(parsed)) {
        result[field] = String(parsed);
      }
      continue;
    }

    result[field] = String(rawValue);
  }

  return result as Partial<EditableExifInput>;
};

const exifUpdateValidators = [
  param("id").isUUID(),
  body("make").optional({ nullable: true }).isString().isLength({ max: 255 }),
  body("model").optional({ nullable: true }).isString().isLength({ max: 255 }),
  body("dateTimeOriginal")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 }),
  body("iso")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("iso must be a positive number"),
  body("fNumber")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("fNumber must be a positive number"),
  body("exposure")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 }),
  body("focalLength")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 }),
  body("gpsLatitude")
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 }),
  body("gpsLongitude")
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 }),
  body("software")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 }),
];

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

    try {
      // Step 1: Extract EXIF metadata - doubles as validation for corrupted images
      let metadata;
      try {
        metadata = await getExifDataFromPath(tempFilePath);
      } catch (metadataError) {
        console.error("Failed to read EXIF data:", metadataError);
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
        return sendError(
          res,
          thumbnailError instanceof Error
            ? thumbnailError.message
            : "Failed to generate thumbnail",
          500,
          "THUMBNAIL_GENERATION_FAILED"
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
      const metadataPayload = metadata as Prisma.JsonObject;

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
          originalName: file.originalname,
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

    const skip = (page - 1) * limit;

    const where: Prisma.ImageWhereInput = {};

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
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    // If image is TIFF, convert to WebP for browser compatibility
    if (image.mimetype === "image/tiff") {
      const previewFilename = `preview_${path.basename(
        filePath,
        path.extname(filePath)
      )}.webp`;
      const previewDir = path.join(path.dirname(filePath), "previews");
      const previewPath = path.join(previewDir, previewFilename);

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

        await pipeline.toFile(previewPath);
        res.sendFile(previewPath);
      } catch (error) {
        console.error("Error processing/caching TIFF preview:", error);
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
        sendError(res, "Fail to retrieve image file", 500);
      }
    }
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
      const baseOriginalName =
        originalImage.originalName || originalImage.filename;
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
      const metadataPayload = (await getExifDataFromPath(
        finalImagePath
      )) as Prisma.JsonObject;

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
          originalName: croppedOriginalName,
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
 * Update EXIF metadata for an image
 * PATCH /api/images/:id/exif
 */
router.patch(
  "/:id/exif",
  validate(exifUpdateValidators),
  asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const imageId = req.params.id;
    const updates = sanitizeEditableExifInput(req.body);

    if (Object.keys(updates).length === 0) {
      sendError(res, "No EXIF fields provided", 400, "NO_EXIF_UPDATES");
      return;
    }

    const existingImage = await prisma.image.findUnique({
      where: { id: imageId },
    });

    if (!existingImage) {
      sendNotFound(res, "Image");
      return;
    }

    await writeExifDataToPath(existingImage.path, updates);
    const [metadataPayload, newFileHash, stats] = await Promise.all([
      getExifDataFromPath(existingImage.path),
      calculateFileHash(existingImage.path),
      fs.stat(existingImage.path),
    ]);

    const updatedImage = await prisma.image.update({
      where: { id: imageId },
      data: {
        metadata: metadataPayload as Prisma.JsonObject,
        filehash: newFileHash,
        size: stats.size,
      },
    });

    sendSuccess(res, updatedImage);
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

    const images = await prisma.image.findMany({
      where: { id: { in: ids } },
    });

    if (images.length === 0) {
      sendSuccess(res, { message: "No images found to delete", count: 0 });
      return;
    }

    await Promise.all(
      images.map(async (image) => {
        await deleteFileIfExists(image.path);
        if (image.thumbnail_path) {
          await deleteFileIfExists(image.thumbnail_path);
        }
      })
    );

    const result = await prisma.image.deleteMany({
      where: { id: { in: ids } },
    });

    sendSuccess(res, {
      message: `${result.count} images deleted successfully`,
      count: result.count,
    });
  })
);

export default router;
