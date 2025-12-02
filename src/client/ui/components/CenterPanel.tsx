import React, { useState, useEffect, useRef, useMemo } from "react";
import { ImageFile, ViewMode, FilterType } from "../../types";
import { Button, Badge } from "./common";
import { getImageSrc, getFormattedSize, getExifDimensions } from "../utils";
import { useGalleryContext } from "../context";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import type {
  EditableExifField,
  EditableExifInput,
} from "../../../shared/exif";

type ExifFormFieldKey = EditableExifField;
type ExifFormFieldConfig = {
  key: ExifFormFieldKey;
  label: string;
  type: "text" | "number";
  step?: string;
};

const EXIF_FORM_FIELDS: ReadonlyArray<ExifFormFieldConfig> = [
  { key: "make", label: "Make", type: "text" },
  { key: "model", label: "Model", type: "text" },
  { key: "dateTimeOriginal", label: "Date/Time Original", type: "text" },
  { key: "iso", label: "ISO", type: "number" },
  { key: "fNumber", label: "F-Number", type: "number", step: "0.1" },
  { key: "exposure", label: "Exposure", type: "text" },
  { key: "focalLength", label: "Focal Length", type: "text" },
  {
    key: "gpsLatitude",
    label: "GPS Latitude",
    type: "number",
    step: "0.000001",
  },
  {
    key: "gpsLongitude",
    label: "GPS Longitude",
    type: "number",
    step: "0.000001",
  },
  { key: "software", label: "Software", type: "text" },
];

type ExifFormState = Record<ExifFormFieldKey, string>;
type ImageMetadataShape = NonNullable<ImageFile["metadata"]>;

const NUMERIC_EXIF_FIELDS = new Set<ExifFormFieldKey>([
  "iso",
  "fNumber",
  "gpsLatitude",
  "gpsLongitude",
]);

// get the value of a metadata field, if it doesn't exist, return an empty string
const getMetadataValue = (
  metadata: ImageFile["metadata"],
  key: ExifFormFieldKey
): string => {
  if (!metadata) return "";
  const value = metadata[key as keyof ImageMetadataShape];
  if (value === null || value === undefined) return "";
  return String(value);
};

// metadata may not contain all fields, so need to build the form state from the metadata
const buildFormStateFromMetadata = (
  metadata: ImageFile["metadata"]
): ExifFormState => {
  const state = {} as ExifFormState;
  EXIF_FORM_FIELDS.forEach(({ key }) => {
    state[key] = getMetadataValue(metadata, key);
  });
  return state;
};

interface CenterPanelProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
}

export default function CenterPanel({
  viewMode,
  setViewMode,
  isLeftPanelOpen,
  onToggleLeftPanel,
}: CenterPanelProps) {
  const {
    images,
    selectedImages,
    activeId,
    setActiveId,
    filterType,
    setFilterType,
    toggleSelection,
    selectAll,
    deleteImages,
    cropImage,
    updateExif,
    loading,
    page,
    totalPages,
    nextPage,
    prevPage,
    total,
    sync,
    addLog,
  } = useGalleryContext();
  const activeImage = images.find((img) => img.id === activeId);
  const [isCropping, setIsCropping] = useState(false);
  const [isEditingExif, setIsEditingExif] = useState(false);
  const cropperRef = useRef<HTMLImageElement>(null);
  const [exifForm, setExifForm] = useState<ExifFormState>(
    buildFormStateFromMetadata(activeImage?.metadata ?? null)
  );

  // Helper to check if an image is selected
  const isImageSelected = (imageId: string) => {
    return Array.from(selectedImages).some((img) => img.id === imageId);
  };

  // Reset cropping when active image changes or view mode changes
  useEffect(() => {
    setIsCropping(false);
  }, [activeId, viewMode]);

  useEffect(() => {
    setIsEditingExif(false);
    setExifForm(buildFormStateFromMetadata(activeImage?.metadata ?? null));
  }, [activeId, activeImage?.metadata]);

  const handleThumbnailClick = (e: React.MouseEvent, id: string) => {
    const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
    toggleSelection(id, isMulti);
  };

  const handleSync = () => {
    sync();
    addLog("Sync gallery completed", "info");
  };

  const handleExport = async () => {
    try {
      const selectedImagesArray = Array.from(selectedImages);
      const result = await window.electronAPI.exportImages(selectedImagesArray);

      if (result.cancelled) {
        addLog("Export cancelled.", "info");
      }
    } catch (err) {
      console.error("Export error:", err);
      addLog(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedImages).map((img) => img.id);
    if (ids.length === 0) {
      addLog("No images selected to delete.", "error");
      return;
    }
    if (
      !window.confirm(
        ids.length === 1
          ? "Delete this image permanently?"
          : `Delete ${ids.length} images permanently?`
      )
    ) {
      return;
    }
    const result = await deleteImages(ids);
    if (result.success) {
      addLog(
        ids.length === 1
          ? "Image deleted successfully."
          : `${ids.length} images deleted successfully.`,
        "success"
      );
    } else {
      addLog(result.error?.message || "Failed to delete images", "error");
    }
  };

  const handleCrop = async () => {
    const imageElement: any = cropperRef?.current;
    const cropper: any = imageElement?.cropper;

    if (typeof cropper !== "undefined" && activeImage) {
      const data = cropper.getData();
      const result = await cropImage(activeImage.id, {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      });
      if (result.success) {
        setIsCropping(false);
      }
    }
  };

  const exifSummary = useMemo(() => {
    if (!activeImage) {
      return [];
    }
    const metadata = activeImage.metadata;
    return [
      { label: "Dimensions", value: getExifDimensions(activeImage) },
      {
        label: "Format",
        value: metadata?.format || activeImage.mimetype || "Unknown",
      },
      {
        label: "MIME Type",
        value: metadata?.mimeType || activeImage.mimetype || "Unknown",
      },
      {
        label: "Orientation",
        value: metadata?.orientation || "Unknown",
      },
    ];
  }, [activeImage]);

  const handleExifInputChange = (key: ExifFormFieldKey, value: string) => {
    setExifForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetExifForm = () => {
    setExifForm(buildFormStateFromMetadata(activeImage?.metadata ?? null));
  };

  const handleToggleExifEditor = () => {
    if (isEditingExif) {
      resetExifForm();
      setIsEditingExif(false);
      return;
    }
    setIsCropping(false);
    setIsEditingExif(true);
  };

  // build the payload for the updateExif function from the exif form state
  const buildExifPayloadFromForm = (): Partial<EditableExifInput> => {
    const payload: Record<string, string | null> = {};

    // keep edited fields only
    EXIF_FORM_FIELDS.forEach(({ key }) => {
      const formValue = exifForm[key] ?? "";
      const originalValue = getMetadataValue(activeImage.metadata, key);

      if (formValue === originalValue) return;

      const trimmed = formValue.trim();
      if (trimmed === "") {
        payload[key] = null;
      } else if (NUMERIC_EXIF_FIELDS.has(key)) {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) payload[key] = String(parsed);
      } else {
        payload[key] = trimmed;
      }
    });

    return payload as Partial<EditableExifInput>;
  };

  const handleSubmitExif = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    const payload = buildExifPayloadFromForm();

    if (Object.keys(payload).length === 0) {
      addLog("No EXIF changes to apply.", "info");
      return;
    }

    const result = await updateExif(activeImage.id, payload);

    if (result.success) {
      addLog("EXIF metadata updated successfully.", "success");
      setIsEditingExif(false);
    } else {
      addLog(
        result.error?.message || "Failed to update EXIF metadata.",
        "error"
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden transition-all duration-300 relative">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            onClick={onToggleLeftPanel}
            variant="ghost"
            size="sm"
            className="px-2!"
            title={isLeftPanelOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              {isLeftPanelOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <select
              className="text-sm border-gray-300 rounded-md border px-2 py-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
            >
              <option value="all">All</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="tiff">TIFF</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={loading}
          >
            Sync
          </Button>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            {selectedImages.size === total && total > 0
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            variant={selectedImages.size > 0 ? "success" : "secondary"}
            size="sm"
            onClick={handleExport}
            disabled={selectedImages.size === 0}
          >
            Export Selected
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedImages.size === 0}
          >
            Delete Selected
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20 backdrop-blur-sm">
            <div className="text-blue-600 font-medium">Loading images...</div>
          </div>
        )}

        {viewMode === "gallery" ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  onClick={(e) => handleThumbnailClick(e, image.id)}
                  onDoubleClick={() => {
                    setActiveId(image.id);
                    setViewMode("single");
                  }}
                  className={`group relative bg-white rounded-lg shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    isImageSelected(image.id)
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <div className="aspect-square bg-gray-100 w-full relative overflow-hidden">
                    <img
                      src={getImageSrc(image, true)}
                      alt={image.originalName || image.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    {isImageSelected(image.id) && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-blue-500 text-white w-5 h-5 p-0! flex items-center justify-center border-2 border-white">
                          ✓
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity text-center">
                      {image.originalName || image.filename}
                    </div>
                  </div>
                  <div className="p-3">
                    <p
                      className="text-sm font-medium text-gray-800 truncate"
                      title={image.originalName || image.filename}
                    >
                      {image.originalName || image.filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getFormattedSize(image.size)}
                    </p>
                  </div>
                </div>
              ))}
              {!loading && images.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                  <p>No images found.</p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 py-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={prevPage}
                  disabled={page <= 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={nextPage}
                  disabled={page >= totalPages || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          // Single View
          <div className="h-full flex flex-col items-center justify-center bg-gray-900/5 rounded-xl border border-gray-200 p-4 relative">
            {activeImage ? (
              <>
                <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
                  {isEditingExif ? (
                    <div className="flex w-full h-full gap-4 max-w-6xl mx-auto">
                      {/* Left: Image Preview */}
                      <div className="flex-1 flex items-center justify-center bg-black/5 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={getImageSrc(activeImage)}
                          alt={activeImage.originalName || activeImage.filename}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      {/* Right: EXIF Form */}
                      <div className="w-96 flex flex-col bg-white rounded-lg border border-gray-200 shadow-lg shrink-0">
                        <div className="p-4 border-b border-gray-100">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Edit Exif Data
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Update EXIF tags for this image
                          </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-md text-xs mb-4">
                            {exifSummary.map((item) => (
                              <div key={item.label}>
                                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">
                                  {item.label}
                                </span>
                                <span className="font-medium text-gray-900">
                                  {item.value || "-"}
                                </span>
                              </div>
                            ))}
                          </div>

                          <form id="exif-form" onSubmit={handleSubmitExif}>
                            <div className="space-y-4">
                              {EXIF_FORM_FIELDS.map(
                                ({ key, label, type, step }) => (
                                  <div key={key} className="space-y-1">
                                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                                      {label}
                                    </label>
                                    <input
                                      type={type}
                                      step={step}
                                      value={exifForm[key]}
                                      onChange={(e) =>
                                        handleExifInputChange(
                                          key,
                                          e.target.value
                                        )
                                      }
                                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                      placeholder={`Enter ${label.toLowerCase()}...`}
                                    />
                                  </div>
                                )
                              )}
                            </div>
                          </form>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end rounded-b-lg">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleToggleExifEditor}
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={resetExifForm}
                            disabled={loading}
                          >
                            Reset
                          </Button>
                          <Button
                            type="submit"
                            form="exif-form"
                            variant="success"
                            disabled={loading}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : isCropping ? (
                    <div className="w-full h-[calc(100vh-300px)] bg-black rounded-lg overflow-hidden shadow-lg">
                      <Cropper
                        src={getImageSrc(activeImage)}
                        style={{ height: "100%", width: "100%" }}
                        initialAspectRatio={NaN}
                        guides={true}
                        ref={cropperRef}
                        viewMode={1}
                        dragMode="move"
                        scalable={true}
                        cropBoxMovable={true}
                        cropBoxResizable={true}
                        background={false}
                        responsive={true}
                        checkCrossOrigin={false}
                      />
                    </div>
                  ) : (
                    <img
                      src={getImageSrc(activeImage)}
                      alt={activeImage.originalName || activeImage.filename}
                      className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded shadow-lg"
                    />
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center gap-3 z-10 w-full">
                  {!isEditingExif && (
                    <div className="flex gap-3 flex-wrap justify-center">
                      {isCropping ? (
                        <>
                          <Button
                            onClick={handleCrop}
                            variant="success"
                            disabled={loading}
                          >
                            Save Crop
                          </Button>
                          <Button
                            onClick={() => setIsCropping(false)}
                            variant="secondary"
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => setIsCropping(true)}
                            variant="secondary"
                            size="sm"
                            disabled={loading || !activeImage}
                          >
                            Edit Image
                          </Button>
                          <Button
                            onClick={handleToggleExifEditor}
                            variant="secondary"
                            size="sm"
                            disabled={loading || !activeImage}
                          >
                            Edit EXIF
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setViewMode("gallery")}
                  className="absolute top-4 left-4 bg-white/90 hover:bg-white backdrop-blur-sm shadow-sm"
                >
                  ← Back to Gallery
                </Button>
              </>
            ) : (
              <div className="text-gray-500">Select an image to view</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
