import React from "react";
import { ImageFile } from "../types";

// Helper function to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const API_BASE_URL = "http://localhost:3000/api";
const STATIC_FILE_BASE_URL = "http://localhost:3000";

export const getImageSrc = (image: ImageFile, useThumbnail = false) => {
  if (!image) return "";

  if (useThumbnail && image.thumbnail_path) {
    const filenameNoExt = image.filename.replace(/\.[^/.]+$/, "");
    return `${STATIC_FILE_BASE_URL}/uploads/${image.folder_name}/thumbnails/thumb_${filenameNoExt}.webp`;
  }

  // For full image, request via API to handle TIFF conversion
  return `${API_BASE_URL}/images/${image.id}`;
};

export const getFormattedSize = (size: number) => formatBytes(size);
export const getFormattedDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString();
export const getExifDimensions = (image: ImageFile) => {
  const parseValue = (value?: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const width = parseValue(image.metadata?.imageWidth);
  const height = parseValue(image.metadata?.imageHeight);

  if (width !== undefined && height !== undefined) {
    return `${width}x${height}`;
  }

  return "Unknown";
};
