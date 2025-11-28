import React, { useState, useRef, useEffect } from "react";
import { LogEntry } from "./App";

interface BottomPanelProps {
  logs: LogEntry[];
}

export default function BottomPanel({ logs }: BottomPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  return (
    <div
      className={`${isOpen ? "h-48" : "h-9"} bg-gray-900 text-gray-300 flex flex-col border-t border-gray-800 shadow-inner transition-all duration-300`}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
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
