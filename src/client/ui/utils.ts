import React from "react";
import { ImageFile } from "./types";

// Helper function to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const STATIC_FILE_BASE_URL = "http://localhost:3000";

export const getImageSrc = (image: ImageFile, useThumbnail = false) => {
  if (!image) return "";
  const path =
    useThumbnail && image.thumbnail_path
      ? image.thumbnail_path
      : image.filename;
  // Assuming folder structure: /uploads/{folder_name}/{filename}
  // and thumbnails: /uploads/{folder_name}/thumbnails/thumb_{filename}

  if (useThumbnail && image.thumbnail_path) {
    return `${STATIC_FILE_BASE_URL}/uploads/${image.folder_name}/thumbnails/thumb_${image.filename}`;
  }
  return `${STATIC_FILE_BASE_URL}/uploads/${image.folder_name}/${image.filename}`;
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
