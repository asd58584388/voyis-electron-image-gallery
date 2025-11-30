import React, { useState, useEffect } from "react";
import LeftPanel from "./LeftPanel";
import CenterPanel from "./CenterPanel";
import BottomPanel from "./BottomPanel";
import { useImageGallery, useLogs } from "../hooks";
import { ViewMode } from "../../types";
import { getImageSrc } from "../utils";

export default function App() {
  const {
    images,
    filteredImages,
    selectedIds,
    activeImage,
    activeId,
    filterType,
    setFilterType,
    setActiveId,
    handleUpload,
    toggleSelection,
    selectAll,
    loading,
    page,
    totalPages,
    nextPage,
    prevPage,
    total,
    deleteImage,
    cropImage, // Add cropImage
    refresh,
  } = useImageGallery();

  const { logs, addLog } = useLogs();

  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);

  useEffect(() => {
    // Setup IPC listeners
    if (window.electronAPI) {
      window.electronAPI.onExportProgress((message) => {
        addLog(message, "info");
      });
      window.electronAPI.onExportComplete((message) => {
        addLog(message, "success");
      });
      window.electronAPI.onBatchUploadProgress((message) => {
        addLog(message, "info");
      });
      window.electronAPI.onBatchUploadComplete((message) => {
        addLog(message, "success");
      });
    }
  }, [addLog]);

  const onUpload = () => {
    handleUpload();
    addLog("Refreshed image list after upload", "success");
  };

  const onBatchUpload = async () => {
    if (window.electronAPI) {
      // addLog("Starting batch upload...", "info"); // Optional, main process sends progress
      await window.electronAPI.batchUpload();
      refresh();
    }
  };

  const onSelectAll = () => {
    const isSelected = selectAll();
    addLog(
      isSelected
        ? `Selected all ${images.length} images`
        : "Deselected all images"
    );
  };

  const onExport = async () => {
    if (selectedIds.size === 0) {
      addLog("No images selected for export.", "error");
      return;
    }

    try {
      const targetFolder = await window.electronAPI.selectFolder();
      if (!targetFolder) {
        addLog("Export cancelled (no folder selected).", "info");
        return;
      }

      addLog(
        `Exporting ${selectedIds.size} images to ${targetFolder}...`,
        "info"
      );

      // Get full URLs for selected images
      const selectedImages = images.filter((img) => selectedIds.has(img.id));
      // const imageUrls = selectedImages.map(img => getImageSrc(img, false)); // No longer needed

      await window.electronAPI.exportImages(selectedImages, targetFolder);
    } catch (err) {
      console.error("Export error:", err);
      addLog(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    }
  };

  const onDelete = async (id: string) => {
    const success = await deleteImage(id);
    if (success) {
      addLog("Image deleted successfully", "success");
    } else {
      addLog("Failed to delete image", "error");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          isOpen={isLeftPanelOpen}
          onUpload={onUpload}
          onBatchUpload={onBatchUpload}
          activeImage={activeImage}
          selectedCount={selectedIds.size}
        />

        {/* Center Panel */}
        <CenterPanel
          images={filteredImages}
          totalImages={total}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedIds={selectedIds}
          filterType={filterType}
          setFilterType={setFilterType}
          onSelectionChange={toggleSelection}
          onSelectAll={onSelectAll}
          onExport={onExport}
          onDelete={onDelete}
          onCrop={cropImage}
          activeId={activeId}
          setActiveId={setActiveId}
          isLeftPanelOpen={isLeftPanelOpen}
          onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onNextPage={nextPage}
          onPrevPage={prevPage}
        />
      </div>

      {/* Bottom Panel */}
      <BottomPanel
        logs={logs}
        isOpen={isBottomPanelOpen}
        onToggle={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
      />
    </div>
  );
}
