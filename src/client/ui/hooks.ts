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

  const handleUpload = useCallback(async () => {
    // Create a file input element dynamically
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/tiff"; // Accepted formats
    input.style.display = "none";

    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/images`, {
          method: "POST",
          body: formData,
        });

        let result: ApiResponse<ImageFile> | null = null;
        try {
          result = await response.json();
        } catch (e) {
          // ignore json parse error
        }

        if (!response.ok) {
          if (result?.error?.message) {
            throw new Error(result.error.message);
          }
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText}`
          );
        }

        if (result && result.success) {
          // Refresh images after successful upload
          fetchImages();
        } else {
          throw new Error(result?.error?.message || "Failed to upload image");
        }
      } catch (err) {
        console.error("Failed to upload image:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
        // Remove the input element
        input.remove();
      }
    };

    // Trigger the file dialog
    document.body.appendChild(input);
    input.click();
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

  const deleteImage = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/images/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse<any> = await response.json();

        if (result.success) {
          // Refresh images after deletion
          fetchImages();
          // Remove from selection if selected
          if (selectedIds.has(id)) {
            setSelectedIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
          if (activeId === id) {
            setActiveId(null);
          }
          return true;
        } else {
          throw new Error(result.error?.message || "Failed to delete image");
        }
      } catch (err) {
        console.error("Failed to delete image:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      }
    },
    [fetchImages, selectedIds, activeId]
  );

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
    deleteImage,
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
