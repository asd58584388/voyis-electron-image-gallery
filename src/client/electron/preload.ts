import { contextBridge, ipcRenderer } from "electron";
import { IPCMessage } from "../types";

contextBridge.exposeInMainWorld("electronAPI", {
  exportImages: (images: any[], targetFolder: string) =>
    ipcRenderer.invoke("export-images", images, targetFolder),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  batchUpload: () => ipcRenderer.invoke("batch-upload"),
  onExportProgress: (callback: (data: IPCMessage) => void) =>
    ipcRenderer.on("export-progress", (_event, data: IPCMessage) =>
      callback(data)
    ),
  onExportComplete: (callback: (data: IPCMessage) => void) =>
    ipcRenderer.on("export-complete", (_event, data: IPCMessage) =>
      callback(data)
    ),
  onBatchUploadProgress: (callback: (data: IPCMessage) => void) =>
    ipcRenderer.on("batch-upload-progress", (_event, data: IPCMessage) =>
      callback(data)
    ),
  onBatchUploadComplete: (callback: (data: IPCMessage) => void) =>
    ipcRenderer.on("batch-upload-complete", (_event, data: IPCMessage) =>
      callback(data)
    ),
});
