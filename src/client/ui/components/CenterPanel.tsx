import React, { useState, useMemo } from "react";
import { ImageFile } from "./App";

interface CenterPanelProps {
  images: ImageFile[];
  viewMode: "gallery" | "single";
  setViewMode: (mode: "gallery" | "single") => void;
  selectedImageIds: Set<string>;
  onSelectionChange: (id: string, multi: boolean) => void;
  onSelectAll: () => void;
  onExport: () => void;
  currentImageId: string | null;
  setCurrentImageId: (id: string | null) => void;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
}

export default function CenterPanel({
  images,
  viewMode,
  setViewMode,
  selectedImageIds,
  onSelectionChange,
  onSelectAll,
  onExport,
  currentImageId,
  setCurrentImageId,
  isLeftPanelOpen,
  onToggleLeftPanel,
}: CenterPanelProps) {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredImages = useMemo(() => {
    if (filterType === "all") return images;
    return images.filter((img) => img.type.includes(filterType));
  }, [images, filterType]);

  const activeImage = images.find((img) => img.id === currentImageId);

  const handleThumbnailClick = (e: React.MouseEvent, id: string) => {
    const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
    onSelectionChange(id, isMulti);
    setCurrentImageId(id);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden transition-all duration-300">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle */}
          <button
            onClick={onToggleLeftPanel}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
          </button>

          <div className="h-4 w-px bg-gray-300"></div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filter:</span>
            <select
              className="text-sm border-gray-300 rounded-md border px-2 py-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Files</option>
              <option value="jpeg">JPEG Images</option>
              <option value="png">PNG Images</option>
            </select>
          </div>

          <div className="h-4 w-px bg-gray-300"></div>

          {/* View Switcher */}
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
          <button
            onClick={onSelectAll}
            className="text-sm text-gray-600 hover:text-gray-900 px-2"
          >
            {selectedImageIds.size === images.length && images.length > 0
              ? "Deselect All"
              : "Select All"}
          </button>
          <button
            onClick={onExport}
            disabled={selectedImageIds.size === 0}
            className={`text-sm font-medium py-1.5 px-4 rounded-md transition-colors ${
              selectedImageIds.size > 0
                ? "bg-green-600 hover:bg-green-700 text-white shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Export Selected
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === "gallery" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                onClick={(e) => handleThumbnailClick(e, image.id)}
                onDoubleClick={() => {
                  setCurrentImageId(image.id);
                  setViewMode("single");
                }}
                className={`group relative bg-white rounded-lg shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  selectedImageIds.has(image.id)
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <div className="aspect-square bg-gray-100 w-full relative overflow-hidden">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  {selectedImageIds.has(image.id) && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p
                    className="text-sm font-medium text-gray-800 truncate"
                    title={image.name}
                  >
                    {image.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{image.size}</p>
                </div>
              </div>
            ))}
            {filteredImages.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-500">
                <p>No images found matching filter.</p>
              </div>
            )}
          </div>
        ) : (
          // Single View
          <div className="h-full flex flex-col items-center justify-center bg-gray-900/5 rounded-xl border border-gray-200 p-4 relative">
            {activeImage ? (
              <>
                <div className="relative max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={activeImage.url}
                    alt={activeImage.name}
                    className="max-w-full max-h-[calc(100vh-300px)] object-contain rounded shadow-lg"
                  />
                </div>
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-medium text-gray-900">
                    {activeImage.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {activeImage.dimensions} • {activeImage.size}
                  </p>
                </div>
                <button
                  onClick={() => setViewMode("gallery")}
                  className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-lg shadow-sm text-sm font-medium backdrop-blur-sm transition-colors"
                >
                  ← Back to Gallery
                </button>
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
