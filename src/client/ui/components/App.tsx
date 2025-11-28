import React, { useState } from "react";
import LeftPanel from "./LeftPanel";
import CenterPanel from "./CenterPanel";
import BottomPanel from "./BottomPanel";
import { useImageGallery, useLogs } from "../hooks";
import { ViewMode } from "../types";

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
  } = useImageGallery();

  const { logs, addLog } = useLogs();

  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);

  const onUpload = () => {
    const newImage = handleUpload();
    addLog(`Uploaded file: ${newImage.name}`, "success");
  };

  const onSelectAll = () => {
    const isSelected = selectAll();
    addLog(
      isSelected
        ? `Selected all ${images.length} images`
        : "Deselected all images"
    );
  };

  const onExport = () => {
    if (selectedIds.size === 0) {
      addLog("No images selected for export.", "error");
      return;
    }
    addLog(`Exporting ${selectedIds.size} images to folder...`, "info");
    setTimeout(() => {
      addLog("Export completed successfully.", "success");
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          isOpen={isLeftPanelOpen}
          onUpload={onUpload}
          activeImage={activeImage}
          selectedCount={selectedIds.size}
        />

        {/* Center Panel */}
        <CenterPanel
          images={filteredImages}
          totalImages={images.length}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedIds={selectedIds}
          filterType={filterType}
          setFilterType={setFilterType}
          onSelectionChange={toggleSelection}
          onSelectAll={onSelectAll}
          onExport={onExport}
          activeId={activeId}
          setActiveId={setActiveId}
          isLeftPanelOpen={isLeftPanelOpen}
          onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
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
