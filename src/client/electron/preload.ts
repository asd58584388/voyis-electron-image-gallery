import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  exportImages: (images: any[], targetFolder: string) =>
    ipcRenderer.invoke("export-images", images, targetFolder),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  batchUpload: () => ipcRenderer.invoke("batch-upload"),
  onExportProgress: (callback: (message: string) => void) =>
    ipcRenderer.on("export-progress", (_event, message) => callback(message)),
  onExportComplete: (callback: (message: string) => void) =>
    ipcRenderer.on("export-complete", (_event, message) => callback(message)),
  onBatchUploadProgress: (callback: (message: string) => void) =>
    ipcRenderer.on("batch-upload-progress", (_event, message) =>
      callback(message)
    ),
  onBatchUploadComplete: (callback: (message: string) => void) =>
    ipcRenderer.on("batch-upload-complete", (_event, message) =>
      callback(message)
    ),
});
