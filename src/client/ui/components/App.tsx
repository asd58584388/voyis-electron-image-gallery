import React, { useState, useEffect } from "react";
import LeftPanel from "./LeftPanel";
import CenterPanel from "./CenterPanel";
import BottomPanel from "./BottomPanel";

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

const MOCK_IMAGES: ImageFile[] = [
  {
    id: "1",
    name: "mountain_view.jpg",
    url: "https://placehold.co/600x400/2a9d8f/ffffff?text=Mountain+View",
    type: "image/jpeg",
    size: "2.4 MB",
    date: "2023-10-01",
    dimensions: "1920x1080",
  },
  {
    id: "2",
    name: "ocean_sunset.png",
    url: "https://placehold.co/600x400/e76f51/ffffff?text=Ocean+Sunset",
    type: "image/png",
    size: "3.1 MB",
    date: "2023-10-02",
    dimensions: "2400x1600",
  },
  {
    id: "3",
    name: "forest_path.jpg",
    url: "https://placehold.co/600x400/264653/ffffff?text=Forest+Path",
    type: "image/jpeg",
    size: "1.8 MB",
    date: "2023-10-03",
    dimensions: "1200x800",
  },
  {
    id: "4",
    name: "city_lights.jpg",
    url: "https://placehold.co/600x400/e9c46a/000000?text=City+Lights",
    type: "image/jpeg",
    size: "4.2 MB",
    date: "2023-10-04",
    dimensions: "3000x2000",
  },
  {
    id: "5",
    name: "abstract_art.png",
    url: "https://placehold.co/600x400/f4a261/000000?text=Abstract",
    type: "image/png",
    size: "5.5 MB",
    date: "2023-10-05",
    dimensions: "4000x4000",
  },
  {
    id: "6",
    name: "team_photo.jpg",
    url: "https://placehold.co/600x400/6d597a/ffffff?text=Team",
    type: "image/jpeg",
    size: "2.1 MB",
    date: "2023-10-06",
    dimensions: "1500x1000",
  },
  {
    id: "7",
    name: "product_shot.jpg",
    url: "https://placehold.co/600x400/355070/ffffff?text=Product",
    type: "image/jpeg",
    size: "1.2 MB",
    date: "2023-10-07",
    dimensions: "1000x1000",
  },
  {
    id: "8",
    name: "diagram.png",
    url: "https://placehold.co/600x400/b56576/ffffff?text=Diagram",
    type: "image/png",
    size: "0.5 MB",
    date: "2023-10-08",
    dimensions: "800x600",
  },
];

export default function App() {
  const [images, setImages] = useState<ImageFile[]>(MOCK_IMAGES);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    new Set()
  );
  const [viewMode, setViewMode] = useState<"gallery" | "single">("gallery");
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString(),
      message: "System initialized.",
      type: "info",
    },
  ]);

  const addLog = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setLogs((prev) => [
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
      ...prev,
    ]);
  };

  const handleUpload = () => {
    // Mock upload
    const newImage: ImageFile = {
      id: Date.now().toString(),
      name: `uploaded_image_${Date.now()}.jpg`,
      url: "https://placehold.co/600x400/606c38/ffffff?text=New+Upload",
      type: "image/jpeg",
      size: "2.0 MB",
      date: new Date().toISOString().split("T")[0],
      dimensions: "1920x1080",
    };
    setImages((prev) => [newImage, ...prev]);
    addLog(`Uploaded file: ${newImage.name}`, "success");
  };

  const handleSelectionChange = (id: string, multi: boolean) => {
    setSelectedImageIds((prev) => {
      const newSet = new Set(multi ? prev : []);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      // Update current image if needed for single view
      if (newSet.has(id)) {
        setCurrentImageId(id);
      }
      return newSet;
    });

    if (!multi) {
      setCurrentImageId(id);
    }
  };

  const handleSelectAll = () => {
    if (selectedImageIds.size === images.length) {
      setSelectedImageIds(new Set());
      addLog("Deselected all images");
    } else {
      setSelectedImageIds(new Set(images.map((img) => img.id)));
      addLog(`Selected all ${images.length} images`);
    }
  };

  const handleExport = () => {
    if (selectedImageIds.size === 0) {
      addLog("No images selected for export.", "error");
      return;
    }
    addLog(`Exporting ${selectedImageIds.size} images to folder...`, "info");
    setTimeout(() => {
      addLog("Export completed successfully.", "success");
    }, 1000);
  };

  const activeImage =
    images.find((img) => img.id === currentImageId) || images[0];

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-800 overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel */}
        <LeftPanel
          onUpload={handleUpload}
          activeImage={activeImage}
          selectedCount={selectedImageIds.size}
        />

        {/* Center Panel */}
        <CenterPanel
          images={images}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedImageIds={selectedImageIds}
          onSelectionChange={handleSelectionChange}
          onSelectAll={handleSelectAll}
          onExport={handleExport}
          currentImageId={currentImageId}
          setCurrentImageId={setCurrentImageId}
        />
      </div>

      {/* Bottom Panel */}
      <BottomPanel logs={logs} />
    </div>
  );
}
