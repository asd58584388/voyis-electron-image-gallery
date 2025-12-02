import React, { createContext, useContext, ReactNode } from "react";
import { useImageGallery, useLogs } from "./hooks";

// Create context type
type GalleryContextType = ReturnType<typeof useImageGallery> &
  ReturnType<typeof useLogs>;

const GalleryContext = createContext<GalleryContextType | null>(null);

// Provider component
export function GalleryProvider({ children }: { children: ReactNode }) {
  const galleryState = useImageGallery();
  const logsState = useLogs();

  return (
    <GalleryContext.Provider value={{ ...galleryState, ...logsState }}>
      {children}
    </GalleryContext.Provider>
  );
}

// Hook to use the context
export function useGalleryContext() {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error("useGalleryContext must be used within GalleryProvider");
  }
  return context;
}
