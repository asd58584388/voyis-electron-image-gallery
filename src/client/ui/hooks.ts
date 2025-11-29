import { useState, useMemo, useCallback, useEffect } from "react";
import { ImageFile, LogEntry, FilterType, ApiResponse } from "./types";

const API_BASE_URL = "http://localhost:3000/api";

export function useImageGallery() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [total, setTotal] = useState(0);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/images?page=${page}&limit=${limit}`;
      if (filterType !== "all") {
        url += `&mimetype=image/${filterType}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<ImageFile[]> = await response.json();

      if (result.success) {
        setImages(result.data);
        if (result.meta) {
          setTotal(result.meta.total);
        }
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (err) {
      console.error("Failed to fetch images:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterType]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const filteredImages = useMemo(() => {
    if (filterType === "all") return images;
    return images.filter((img) => img.mimetype.includes(filterType));
  }, [images, filterType]);

  const activeImage = useMemo(
    () => images.find((img) => img.id === activeId) || images[0],
    [images, activeId]
  );

  const handleUpload = useCallback(() => {
    // Upload logic would go here (POST to /api/images)
    // For now, just refreshing the list might be enough after an external upload
    fetchImages();
  }, [fetchImages]);

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

  const totalPages = Math.ceil(total / limit);

  const nextPage = useCallback(() => {
    if (page < totalPages) setPage((p) => p + 1);
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

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
    loading,
    error,
    page,
    setPage,
    totalPages,
    nextPage,
    prevPage,
    total,
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
