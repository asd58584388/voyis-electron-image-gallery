import type { ExifMetadata } from "../shared/exif";

export type ImageMetadata = ExifMetadata;

export interface ImageFile {
  id: string;
  filename: string;
  path: string;
  thumbnail_path: string | null;
  originalName: string;
  folder_name: string;
  size: number;
  mimetype: string;
  filehash: string;
  metadata: ImageMetadata | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
}

export interface UploadFile {
  path: string;
  name: string;
}

export type ViewMode = "gallery" | "single";
export type FilterType = "all" | "jpeg" | "png" | "tiff";

export interface IPCMessage {
  message: string;
  type: "info" | "success" | "error";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
  };
}
