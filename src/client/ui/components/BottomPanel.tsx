import React, { useEffect, useRef } from "react";
import { LogEntry } from "./App";

interface BottomPanelProps {
  logs: LogEntry[];
}

export default function BottomPanel({ logs }: BottomPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-48 bg-gray-900 text-gray-300 flex flex-col border-t border-gray-800 shadow-inner">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          System Logs
        </h3>
        <span className="text-xs text-gray-500">{logs.length} events</span>
      </div>

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
            className="flex gap-3 hover:bg-gray-800/50 p-1 rounded transition-colors"
          >
            <span className="text-gray-500 whitespace-nowrap select-none w-20">
              {log.timestamp}
            </span>
            <span
              className={`flex-1 break-all ${
                log.type === "error"
                  ? "text-red-400"
                  : log.type === "success"
                    ? "text-green-400"
                    : "text-gray-300"
              }`}
            >
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
