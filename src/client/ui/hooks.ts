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

  const handleUpload = useCallback(
    async (file: File | null): Promise<ApiResponse<ImageFile>> => {
      if (!file) {
        return {
          success: false,
          error: { message: "No file selected" },
        };
      }

      const formData = new FormData();
      formData.append("file", file);

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/images`, {
          method: "POST",
          body: formData,
        });

        const result: ApiResponse<ImageFile> = await response.json();

        if (!result.success) {
          const errorMessage =
            result.error?.message ||
            `Upload failed: ${response.status} ${response.statusText}`;
          setError(errorMessage);
          return result;
        }

        await fetchImages();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to upload image";
        console.error("Failed to upload image:", err);
        setError(errorMessage);
        return {
          success: false,
          error: { message: errorMessage },
        };
      } finally {
        setLoading(false);
      }
    },
    [fetchImages]
  );

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
    async (id: string): Promise<ApiResponse<null>> => {
      try {
        const response = await fetch(`${API_BASE_URL}/images/${id}`, {
          method: "DELETE",
        });

        const result: ApiResponse<null> = await response.json();

        if (result.success) {
          fetchImages();
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
        } else {
          setError(result.error?.message || "Failed to delete image");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete image";
        console.error("Failed to delete image:", err);
        setError(errorMessage);
        return {
          success: false,
          error: { message: errorMessage },
        };
      }
    },
    [fetchImages, activeId]
  );

  const cropImage = useCallback(
    async (
      id: string,
      cropData: { x: number; y: number; width: number; height: number }
    ): Promise<ApiResponse<ImageFile>> => {
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

        const result: ApiResponse<ImageFile> = await response.json();

        if (result.success) {
          await fetchImages();
        } else {
          setError(result.error?.message || "Failed to crop image");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to crop image";
        console.error("Failed to crop image:", err);
        setError(errorMessage);
        return {
          success: false,
          error: { message: errorMessage },
        };
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
