export interface ExifData {
  hasExif: boolean;
  orientation?: number;
  [key: string]: any;
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  exif?: ExifData | null;
  originalName: string;
}

export interface ImageFile {
  id: string;
  filename: string;
  path: string;
  thumbnail_path: string | null;
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

export type ViewMode = "gallery" | "single";
export type FilterType = "all" | "jpeg" | "png";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
