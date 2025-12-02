import { contextBridge, ipcRenderer } from "electron";
import { IPCMessage, ImageFile } from "../types";

contextBridge.exposeInMainWorld("electronAPI", {
  exportImages: (images: ImageFile[]) =>
    ipcRenderer.invoke("export-images", images),
  batchUpload: () => ipcRenderer.invoke("batch-upload"),
  onLog: (callback: (data: IPCMessage) => void) =>
    ipcRenderer.on("log", (_event, data: IPCMessage) => callback(data)),
});
