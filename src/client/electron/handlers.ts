import { ipcMain, dialog, BrowserWindow } from "electron";
import { handleExportImages } from "./features/export";
import { handleBatchUpload } from "./features/upload";
import { ImageFile } from "../types";

export function setupHandlers(mainWindow: BrowserWindow) {
  // Handle export images (includes folder selection)
  ipcMain.handle("export-images", async (event, images: ImageFile[]) => {
    // Show folder selection dialog
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (result.canceled) {
      return { cancelled: true };
    }

    const targetFolder = result.filePaths[0];
    await handleExportImages(mainWindow, images, targetFolder);
    return { cancelled: false, targetFolder };
  });

  // Handle batch upload
  ipcMain.handle("batch-upload", async () => {
    await handleBatchUpload(mainWindow);
  });
}
