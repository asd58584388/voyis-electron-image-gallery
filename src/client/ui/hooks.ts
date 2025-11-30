import { useState, useMemo, useCallback, useEffect } from "react";
import { ImageFile, LogEntry, FilterType, ApiResponse } from "../types";

const API_BASE_URL = "http://localhost:3000/api";
const DEFAULT_LIMIT = 50;

export function useImageGallery() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<ImageFile>>(
    new Set()
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);

  const fetchImages = useCallback(
    async (params?: {
      page?: number;
      limit?: number;
      filterType?: FilterType;
    }) => {
      const fetchPage = params?.page ?? page;
      const fetchLimit = params?.limit ?? limit;
      const fetchFilter = params?.filterType ?? filterType;

      setLoading(true);
      setError(null);
      try {
        let url = `${API_BASE_URL}/images?page=${fetchPage}&limit=${fetchLimit}`;
        if (fetchFilter !== "all") {
          url += `&mimetype=image/${fetchFilter}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse<ImageFile[]> = await response.json();

        if (result.success) {
          setImages(result.data);
          if (result.metadata?.total !== undefined) {
            setTotal(result.metadata.total);
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
    },
    [page, limit, filterType]
  );

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

  const toggleSelection = useCallback(
    (id: string, multi: boolean) => {
      setSelectedImages((prev) => {
        const newSet = new Set(multi ? prev : []);
        const image = images.find((img) => img.id === id);

        if (!image) return prev;

        // Check if image is already selected by ID
        const existingImage = Array.from(newSet).find((img) => img.id === id);

        if (existingImage) {
          newSet.delete(existingImage);
        } else {
          newSet.add(image);
        }

        if (!existingImage || !multi) {
          setActiveId(id);
        }

        return newSet;
      });
    },
    [images]
  );

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
          setSelectedImages((prev) => {
            const imageToRemove = Array.from(prev).find((img) => img.id === id);
            if (imageToRemove) {
              const newSet = new Set(prev);
              newSet.delete(imageToRemove);
              return newSet;
            }
            return prev;
          });
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
    [fetchImages, activeId]
  );

  const cropImage = useCallback(
    async (
      id: string,
      cropData: { x: number; y: number; width: number; height: number }
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/images/${id}/crop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cropData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse<ImageFile> = await response.json();

        if (result.success) {
          // Refresh list to show new image
          await fetchImages();
          return true;
        } else {
          throw new Error(result.error?.message || "Failed to crop image");
        }
      } catch (err) {
        console.error("Failed to crop image:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchImages]
  );

  const selectAll = useCallback(() => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
      return false; // Deselected
    } else {
      setSelectedImages(new Set(images));
      return true; // Selected
    }
  }, [images, selectedImages.size]);

  const totalPages = Math.ceil(total / limit);

  const nextPage = useCallback(() => {
    if (page < totalPages) setPage((p) => p + 1);
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  const syncGallery = useCallback(() => {
    setFilterType("all");
    setPage(1);
    setLimit(DEFAULT_LIMIT);
    fetchImages({ page: 1, limit: DEFAULT_LIMIT, filterType: "all" });
  }, [fetchImages]);

  return {
    images,
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
    error,
    page,
    setPage,
    totalPages,
    nextPage,
    prevPage,
    total,
    deleteImage,
    setError,
    cropImage,
    refresh: fetchImages,
    sync: syncGallery,
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
          id: crypto.randomUUID(),
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
