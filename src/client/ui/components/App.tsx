import React, { useState, useEffect } from "react";
import LeftPanel from "./LeftPanel";
import CenterPanel from "./CenterPanel";
import BottomPanel from "./BottomPanel";
import { GalleryProvider, useGalleryContext } from "../context";
import { ViewMode } from "../../types";

function AppContent() {
  const { addLog, refresh } = useGalleryContext();
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onLog((data) => {
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

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 overflow-hidden font-sans">
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel isOpen={isLeftPanelOpen} onBatchUpload={onBatchUpload} />
        <CenterPanel
          viewMode={viewMode}
          setViewMode={setViewMode}
          isLeftPanelOpen={isLeftPanelOpen}
          onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        />
      </div>
      <BottomPanel
        isOpen={isBottomPanelOpen}
        onToggle={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
      />
    </div>
  );
}

export default function App() {
  return (
    <GalleryProvider>
      <AppContent />
    </GalleryProvider>
  );
}
