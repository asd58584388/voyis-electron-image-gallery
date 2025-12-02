import sharp from "sharp";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { exiftool } from "exiftool-vendored";
import type { Tags as ExifTags } from "exiftool-vendored";
import {
  type EditableExifField,
  type EditableExifInput,
  type ExifMetadata,
} from "../../../../shared/exif.js";
import { EDITABLE_EXIF_FIELDS } from "../constants/exif.constants.js";

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
  return crypto.createHash("md5").update(fileBuffer).digest("hex");
}

const EDITABLE_FIELD_TAG_MAP: Record<EditableExifField, string> = {
  make: "Make",
  model: "Model",
  dateTimeOriginal: "DateTimeOriginal",
  iso: "ISO",
  fNumber: "FNumber",
  exposure: "ExposureTime",
  focalLength: "FocalLength",
  gpsLatitude: "GPSLatitude",
  gpsLongitude: "GPSLongitude",
  software: "Software",
};

const normalizeTagValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? normalizeTagValue(value[0]) : undefined;
  }

  const stringified =
    typeof value === "string"
      ? value
      : typeof value === "number"
      ? Number.isFinite(value)
        ? value.toString()
        : ""
      : value instanceof Date
      ? value.toISOString()
      : value.toString();

  const trimmed = stringified.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getTagValue = (tags: ExifTags, tagName: string): string | undefined =>
  normalizeTagValue(tags[tagName as keyof ExifTags]);

const EXIF_FIELD_TAGS: Record<keyof ExifMetadata, string> = {
  imageWidth: "ImageWidth",
  imageHeight: "ImageHeight",
  orientation: "Orientation",
  format: "FileType",
  mimeType: "MIMEType",
  make: "Make",
  model: "Model",
  dateTimeOriginal: "DateTimeOriginal",
  iso: "ISO",
  fNumber: "FNumber",
  exposure: "ExposureTime",
  focalLength: "FocalLength",
  gpsLatitude: "GPSLatitude",
  gpsLongitude: "GPSLongitude",
  software: "Software",
};

/**
 * Extract curated EXIF data for an image using exiftool
 */
export async function getExifDataFromPath(
  filePath: string
): Promise<ExifMetadata> {
  try {
    const tags = await exiftool.read(filePath);
    const metadata: ExifMetadata = {};

    (Object.keys(EXIF_FIELD_TAGS) as Array<keyof ExifMetadata>).forEach(
      (field) => {
        const value = getTagValue(tags, EXIF_FIELD_TAGS[field]);
        if (value !== undefined) {
          metadata[field] = value;
        }
      }
    );

    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to read EXIF data: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

const buildExifWritePayload = (
  updates: Partial<EditableExifInput>
): Record<string, string | null> => {
  const payload: Record<string, string | null> = {};
  for (const field of EDITABLE_EXIF_FIELDS) {
    if (!(field in updates)) continue;
    const value = updates[field];
    if (value === undefined) continue;
    payload[EDITABLE_FIELD_TAG_MAP[field]] = value;
  }
  return payload;
};

/**
 * Write selected EXIF fields back to the file
 */
export async function writeExifDataToPath(
  filePath: string,
  updates: Partial<EditableExifInput>
): Promise<void> {
  const payload = buildExifWritePayload(updates);
  if (Object.keys(payload).length === 0) {
    return;
  }
  try {
    await exiftool.write(filePath, payload, {
      writeArgs: ["-overwrite_original"],
    });
  } catch (error) {
    throw new Error(
      `Failed to update EXIF data: ${
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

process.once("beforeExit", async () => {
  await exiftool.end();
});
