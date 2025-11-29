import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  exportImages: (images: any[], targetFolder: string) =>
    ipcRenderer.invoke("export-images", images, targetFolder),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  onExportProgress: (callback: (message: string) => void) =>
    ipcRenderer.on("export-progress", (_event, message) => callback(message)),
  onExportComplete: (callback: (message: string) => void) =>
    ipcRenderer.on("export-complete", (_event, message) => callback(message)),
});
