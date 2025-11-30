import React, { useState, useEffect, useRef } from "react";
import { ImageFile, ViewMode, FilterType } from "../../types";
import { Button, Badge } from "./common";
import { getImageSrc, getFormattedSize, getDimensions } from "../utils";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

interface CenterPanelProps {
  images: ImageFile[];
  totalImages: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedImages: Set<ImageFile>;
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  onSelectionChange: (id: string, multi: boolean) => void;
  onSelectAll: () => void;
  onExport: () => void;
  onDelete: (id: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  loading?: boolean;
  page: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onCrop: (
    id: string,
    cropData: { x: number; y: number; width: number; height: number }
  ) => Promise<boolean>;
  onRefresh: () => void;
}

export default function CenterPanel({
  images,
  totalImages,
  viewMode,
  setViewMode,
  selectedImages,
  filterType,
  setFilterType,
  onSelectionChange,
  onSelectAll,
  onExport,
  onDelete,
  activeId,
  setActiveId,
  isLeftPanelOpen,
  onToggleLeftPanel,
  loading,
  page,
  totalPages,
  onNextPage,
  onPrevPage,
  onCrop,
  onRefresh,
}: CenterPanelProps) {
  const activeImage = images.find((img) => img.id === activeId);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropperRef = useRef<HTMLImageElement>(null);

  // Helper to check if an image is selected
  const isImageSelected = (imageId: string) => {
    return Array.from(selectedImages).some((img) => img.id === imageId);
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Reset cropping when active image changes or view mode changes
  useEffect(() => {
    setIsCropping(false);
  }, [activeId, viewMode]);

  const handleThumbnailClick = (e: React.MouseEvent, id: string) => {
    const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
    onSelectionChange(id, isMulti);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, id });
  };

  const handleCrop = async () => {
    const imageElement: any = cropperRef?.current;
    const cropper: any = imageElement?.cropper;

    if (typeof cropper !== "undefined" && activeImage) {
      const data = cropper.getData();
      const success = await onCrop(activeImage.id, {
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
      });
      if (success) {
        setIsCropping(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden transition-all duration-300 relative">
      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50 py-1 min-w-[120px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (
                window.confirm("Are you sure you want to delete this image?")
              ) {
                onDelete(contextMenu.id);
              }
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
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

          <div className="h-4 w-px bg-gray-300"></div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <select
              className="text-sm border-gray-300 rounded-md border px-2 py-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
            >
              <option value="all">All Files</option>
              <option value="jpeg">JPEG Images</option>
              <option value="png">PNG Images</option>
              <option value="tiff">TIFF Images</option>
            </select>
          </div>

          <div className="h-4 w-px bg-gray-300"></div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === "gallery"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setViewMode("gallery")}
            >
              Gallery
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === "single"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setViewMode("single")}
            >
              Single View
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            Sync
          </Button>
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            {selectedImages.size === totalImages && totalImages > 0
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            variant={selectedImages.size > 0 ? "success" : "secondary"}
            size="sm"
            onClick={onExport}
            disabled={selectedImages.size === 0}
          >
            Export Selected
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
                  onContextMenu={(e) => handleContextMenu(e, image.id)}
                  className={`group relative bg-white rounded-lg shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    isImageSelected(image.id)
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <div className="aspect-square bg-gray-100 w-full relative overflow-hidden">
                    <img
                      src={getImageSrc(image, true)}
                      alt={image.metadata?.originalName || image.filename}
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
                      {image.metadata?.originalName || image.filename}
                    </div>
                  </div>
                  <div className="p-3">
                    <p
                      className="text-sm font-medium text-gray-800 truncate"
                      title={image.metadata?.originalName || image.filename}
                    >
                      {image.metadata?.originalName || image.filename}
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
                  onClick={onPrevPage}
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
                  onClick={onNextPage}
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
                  {isCropping ? (
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
                      alt={
                        activeImage.metadata?.originalName ||
                        activeImage.filename
                      }
                      className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded shadow-lg"
                    />
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center gap-3 z-10 w-full">
                  {isCropping ? (
                    <div className="flex gap-3">
                      <Button onClick={handleCrop} variant="success">
                        Save Crop
                      </Button>
                      <Button
                        onClick={() => setIsCropping(false)}
                        variant="secondary"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900">
                        {activeImage.metadata?.originalName ||
                          activeImage.filename}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {getDimensions(activeImage)} •{" "}
                        {getFormattedSize(activeImage.size)}
                      </p>
                      <Button
                        onClick={() => setIsCropping(true)}
                        variant="secondary"
                        size="sm"
                      >
                        Crop Image
                      </Button>
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
