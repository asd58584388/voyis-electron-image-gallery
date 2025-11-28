import React from "react";
import { ImageFile, ViewMode, FilterType } from "../types";
import { Button, Badge } from "./common";

interface CenterPanelProps {
  images: ImageFile[];
  totalImages: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedIds: Set<string>;
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  onSelectionChange: (id: string, multi: boolean) => void;
  onSelectAll: () => void;
  onExport: () => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
}

export default function CenterPanel({
  images,
  totalImages,
  viewMode,
  setViewMode,
  selectedIds,
  filterType,
  setFilterType,
  onSelectionChange,
  onSelectAll,
  onExport,
  activeId,
  setActiveId,
  isLeftPanelOpen,
  onToggleLeftPanel,
}: CenterPanelProps) {
  const activeImage = images.find((img) => img.id === activeId);

  const handleThumbnailClick = (e: React.MouseEvent, id: string) => {
    const isMulti = e.metaKey || e.ctrlKey || e.shiftKey;
    onSelectionChange(id, isMulti);
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden transition-all duration-300">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            onClick={onToggleLeftPanel}
            variant="ghost"
            size="sm"
            className="!px-2"
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
          <Button variant="ghost" size="sm" onClick={onSelectAll}>
            {selectedIds.size === totalImages && totalImages > 0
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            variant={selectedIds.size > 0 ? "success" : "secondary"}
            size="sm"
            onClick={onExport}
            disabled={selectedIds.size === 0}
          >
            Export Selected
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {viewMode === "gallery" ? (
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
                  selectedIds.has(image.id)
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
                  {selectedIds.has(image.id) && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-blue-500 text-white w-5 h-5 !p-0 flex items-center justify-center border-2 border-white">
                        ✓
                      </Badge>
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
            {images.length === 0 && (
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
