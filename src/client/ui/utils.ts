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
    // Thumbnails are now served directly via static file server as webp
    // We need to construct the path to the webp thumbnail
    // The thumbnail_path in DB is the absolute file path on server
    // We need to extract the relative path part for the URL
    // Assuming standard structure: .../uploads/{folder_name}/thumbnails/{filename}

    // However, simpler approach for now is to assume the thumbnail filename pattern:
    // thumb_{filename_without_ext}.webp
    const filenameNoExt = image.filename.replace(/\.[^/.]+$/, "");
    return `${STATIC_FILE_BASE_URL}/uploads/${image.folder_name}/thumbnails/thumb_${filenameNoExt}.webp`;
  }

  // For full image, request via API to handle TIFF conversion
  return `${API_BASE_URL}/images/${image.id}`;
};

export const getFormattedSize = (size: number) => formatBytes(size);
export const getFormattedDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString();
export const getDimensions = (image: ImageFile) => {
  if (image.metadata?.width && image.metadata?.height) {
    return `${image.metadata.width}x${image.metadata.height}`;
  }
  return "Unknown";
};
