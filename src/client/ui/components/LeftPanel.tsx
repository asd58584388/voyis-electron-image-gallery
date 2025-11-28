import React from "react";
import { ImageFile } from "./App";

interface LeftPanelProps {
  onUpload: () => void;
  activeImage?: ImageFile;
  selectedCount: number;
}

export default function LeftPanel({
  onUpload,
  activeImage,
  selectedCount,
}: LeftPanelProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Gallery Actions
        </h2>
        <button
          onClick={onUpload}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow transition-colors flex items-center justify-center gap-2"
        >
          <span>Upload Image</span>
        </button>
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
                {activeImage.name}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <div className="text-sm text-gray-700">
                  {activeImage.type.split("/")[1].toUpperCase()}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Size</label>
                <div className="text-sm text-gray-700">{activeImage.size}</div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Dimensions
              </label>
              <div className="text-sm text-gray-700">
                {activeImage.dimensions}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Date Modified
              </label>
              <div className="text-sm text-gray-700">{activeImage.date}</div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="bg-gray-100 rounded p-2 flex items-center justify-center h-32 overflow-hidden">
                <img
                  src={activeImage.url}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain opacity-75"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic text-center py-8">
            No image selected
          </div>
        )}
      </div>
    </div>
  );
}
