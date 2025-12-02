export interface ExifMetadata {
  imageWidth?: string;
  imageHeight?: string;
  orientation?: string;
  format?: string;
  mimeType?: string;
  make?: string;
  model?: string;
  dateTimeOriginal?: string;
  iso?: string;
  fNumber?: string;
  exposure?: string;
  focalLength?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  software?: string;
}

export type EditableExifField =
  | "make"
  | "model"
  | "dateTimeOriginal"
  | "iso"
  | "fNumber"
  | "exposure"
  | "focalLength"
  | "gpsLatitude"
  | "gpsLongitude"
  | "software";

export type EditableExifInput = {
  [K in EditableExifField]?: string | null;
};
