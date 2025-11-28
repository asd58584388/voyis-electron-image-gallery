import { useState, useMemo, useCallback } from "react";
import { ImageFile, LogEntry, FilterType } from "./types";

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

export function useImageGallery() {
  const [images, setImages] = useState<ImageFile[]>(MOCK_IMAGES);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");

  const filteredImages = useMemo(() => {
    if (filterType === "all") return images;
    return images.filter((img) => img.type.includes(filterType));
  }, [images, filterType]);

  const activeImage = useMemo(
    () => images.find((img) => img.id === activeId) || images[0],
    [images, activeId]
  );

  const handleUpload = useCallback(() => {
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
    return newImage;
  }, []);

  const toggleSelection = useCallback((id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(multi ? prev : []);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }

      if (newSet.has(id) || !multi) {
        setActiveId(id);
      }

      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
      return false; // Deselected
    } else {
      setSelectedIds(new Set(images.map((img) => img.id)));
      return true; // Selected
    }
  }, [images, selectedIds.size]);

  return {
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
  };
}

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init",
      timestamp: new Date().toLocaleTimeString(),
      message: "System initialized.",
      type: "info",
    },
  ]);

  const addLog = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      setLogs((prev) => [
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          message,
          type,
        },
        ...prev,
      ]);
    },
    []
  );

  return { logs, addLog };
}
