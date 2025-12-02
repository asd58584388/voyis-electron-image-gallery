import React, { useEffect, useRef } from "react";
import { useGalleryContext } from "../context";

interface BottomPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function BottomPanel({ isOpen, onToggle }: BottomPanelProps) {
  const { logs } = useGalleryContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={`${
        isOpen ? "h-48" : "h-9"
      } bg-gray-900 text-gray-300 flex flex-col border-t border-gray-800 shadow-inner transition-all duration-300`}
    >
      <div
        onClick={onToggle}
        className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex justify-between cursor-pointer hover:bg-gray-700"
      >
        <div className="flex gap-2 items-center text-xs font-bold text-gray-400 uppercase">
          <span>{isOpen ? "▼" : "▲"}</span> System Logs
        </div>
        <span className="text-xs text-gray-500">{logs.length} events</span>
      </div>

      {isOpen && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1"
        >
          {logs.length === 0 && (
            <div className="text-gray-600 italic p-2">
              No activity logged yet.
            </div>
          )}
          {[...logs].reverse().map((log) => (
            <div
              key={log.id}
              className="flex gap-3 hover:bg-white/5 p-1 rounded"
            >
              <span className="text-gray-500 w-16 shrink-0">
                {log.timestamp}
              </span>
              <span
                className={
                  log.type === "error"
                    ? "text-red-400"
                    : log.type === "success"
                      ? "text-green-400"
                      : ""
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
