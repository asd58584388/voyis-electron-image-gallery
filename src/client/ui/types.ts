export interface ImageFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: string;
  date: string;
  dimensions: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error";
}

export type ViewMode = "gallery" | "single";
export type FilterType = "all" | "jpeg" | "png";
