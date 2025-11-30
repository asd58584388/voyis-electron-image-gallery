import React, { useState, useEffect, useRef } from "react";
import LeftPanel from "./LeftPanel";
import CenterPanel from "./CenterPanel";
import BottomPanel from "./BottomPanel";
import { useImageGallery, useLogs } from "../hooks";
import { ViewMode } from "../../types";

export default function App() {
  const {
    filteredImages,
    selectedImages,
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
    cropImage,
    refresh,
    sync,
  } = useImageGallery();

  const { logs, addLog } = useLogs();

  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);

  useEffect(() => {
    // Setup IPC listeners
    if (window.electronAPI) {
      window.electronAPI.onExportProgress((data) => {
        addLog(data.message, data.type);
      });
      window.electronAPI.onExportComplete((data) => {
        addLog(data.message, data.type);
      });
      window.electronAPI.onBatchUploadProgress((data) => {
        addLog(data.message, data.type);
      });
      window.electronAPI.onBatchUploadComplete((data) => {
        addLog(data.message, data.type);
      });
    } else {
      addLog("Electron API not available", "error");
    }
  }, [addLog]);

  const onBatchUpload = async () => {
    if (window.electronAPI) {
      await window.electronAPI.batchUpload();
      refresh();
    }
  };

  const onSync = () => {
    sync();
    addLog("Reset filters and synchronized gallery", "info");
  };

  const onSelectAll = () => {
    const isSelected = selectAll();
    addLog(
      isSelected
        ? `Selected all ${selectedImages.size} images`
        : "Deselected all images"
    );
  };

  const onExport = async () => {
    if (selectedImages.size === 0) {
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
        `Exporting ${selectedImages.size} images to ${targetFolder}...`,
        "info"
      );

      const selectedImagesArray = Array.from(selectedImages);

      await window.electronAPI.exportImages(selectedImagesArray, targetFolder);
    } catch (err) {
      console.error("Export error:", err);
      addLog(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        "error"
      );
    }
  };

  const onDelete = async (id: string) => {
    const result = await deleteImage(id);
    if (result.success) {
      addLog("Image deleted successfully", "success");
    } else {
      addLog(result.error?.message || "Failed to delete image", "error");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          isOpen={isLeftPanelOpen}
          handleUpload={handleUpload}
          onBatchUpload={onBatchUpload}
          activeImage={activeImage}
          selectedCount={selectedImages.size}
          addLog={addLog}
        />

        {/* Center Panel */}
        <CenterPanel
          images={filteredImages}
          totalImages={total}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedImages={selectedImages}
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
          onRefresh={onSync}
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
