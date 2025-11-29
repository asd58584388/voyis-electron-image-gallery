import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Supported image formats for the application
 */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
];

/**
 * Validate if file is a supported image type
 */
export function isValidImageType(mimetype: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimetype.toLowerCase());
}

/**
 * Generate a unique filename based on the original name and hash
 */
export function generateUniqueFilename(
  originalName: string,
  hash: string
): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  return `${hash}_${timestamp}${ext}`;
}

/**
 * Calculate file hash (MD5) for duplicate detection
 * MD5 is sufficient for our use case: fast and collision-resistant enough for images
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return crypto
    .createHash("md5")
    .update(filePath)
    .update(fileBuffer)
    .digest("hex");
}

/**
 * Get image metadata and dimensions from file path
 * More memory-efficient for large 4K images
 * Also validates image integrity - throws error if image is corrupted
 */
export async function getImageMetadataFromPath(filePath: string) {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Extract EXIF data if available (already have metadata, no need to read again)
    const exif = metadata.exif
      ? {
          hasExif: true,
          orientation: metadata.orientation,
          // Add more EXIF fields as needed using exif-parser library for detailed parsing
        }
      : null;

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      exif: exif,
    };
  } catch (error) {
    throw new Error(
      `Failed to read image metadata: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate thumbnail from image file path and save to destination
 * More memory-efficient for large 4K images - processes directly from/to disk
 */
export async function generateThumbnailFromPath(
  sourcePath: string,
  destPath: string,
  width: number = 300,
  height: number = 300
): Promise<void> {
  try {
    const destDir = path.dirname(destPath);
    await ensureDirectoryExists(destDir);

    await sharp(sourcePath)
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toFile(destPath);
  } catch (error) {
    throw new Error(
      `Failed to generate thumbnail: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Move file from source to destination
 */
export async function moveFile(
  sourcePath: string,
  destPath: string
): Promise<void> {
  const destDir = path.dirname(destPath);
  await ensureDirectoryExists(destDir);
  await fs.rename(sourcePath, destPath);
}

/**
 * Delete file if exists
 */
export async function deleteFileIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Get file size in a human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
