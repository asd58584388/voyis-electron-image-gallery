import React from "react";
import { ImageFile } from "../../types";
import { Button } from "./common";
import {
  getImageSrc,
  getFormattedSize,
  getFormattedDate,
  getDimensions,
} from "../utils";

interface LeftPanelProps {
  onUpload: () => void;
  activeImage?: ImageFile;
  selectedCount: number;
  isOpen: boolean;
}

export default function LeftPanel({
  onUpload,
  activeImage,
  selectedCount,
  isOpen,
}: LeftPanelProps) {
  return (
    <div
      className={`${
        isOpen ? "w-64 border-r" : "w-0 border-none"
      } bg-white border-gray-200 flex flex-col shadow-sm z-10 transition-all duration-300 overflow-hidden`}
    >
      <div className="min-w-[16rem] flex flex-col h-full">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Gallery Actions
          </h2>
          <Button onClick={onUpload} variant="primary" className="w-full">
            <span>Upload Image</span>
          </Button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Metadata
          </h3>

          {selectedCount > 1 ? (
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
              <p className="font-medium">{selectedCount} items selected</p>
              <p className="text-sm opacity-75 mt-1">
                Batch actions available in toolbar.
              </p>
            </div>
          ) : activeImage ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  File Name
                </label>
                <div className="text-sm font-medium text-gray-900 break-all">
                  {activeImage.metadata?.originalName || activeImage.filename}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Type
                  </label>
                  <div className="text-sm text-gray-700">
                    {activeImage.mimetype.split("/")[1].toUpperCase()}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Size
                  </label>
                  <div className="text-sm text-gray-700">
                    {getFormattedSize(activeImage.size)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Dimensions
                </label>
                <div className="text-sm text-gray-700">
                  {getDimensions(activeImage)}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Date Modified
                </label>
                <div className="text-sm text-gray-700">
                  {getFormattedDate(activeImage.created_at)}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="bg-gray-100 rounded p-2 flex items-center justify-center h-32 overflow-hidden">
                  <img
                    src={getImageSrc(activeImage, true)}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain opacity-75"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic text-center py-8">
              Select an image
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
