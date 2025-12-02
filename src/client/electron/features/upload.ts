import { dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import { UploadFile } from "../../types";
import { runConcurrent } from "../utils/concurrency";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

export async function handleBatchUpload(mainWindow: BrowserWindow) {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "JSON Config", extensions: ["json"] }],
  });

  if (result.canceled || result.filePaths.length === 0) return;

  // get the config file path
  const configPath = result.filePaths[0];

  // try to parse the config file
  let config: Array<{ folderPath: string; extensions: string[] }>;
  try {
    const content = await fs.promises.readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      config = parsed;
    } else {
      mainWindow.webContents.send("log", {
        message: "Invalid config format: expected an array",
        type: "error" as const,
      });
      return;
    }
  } catch (err) {
    mainWindow.webContents.send("log", {
      message: "Failed to parse config file",
      type: "error" as const,
    });
    return;
  }

  // variables to track the upload progress
  let successCount = 0;
  let failCount = 0;
  let totalSize = 0;
  // all files to upload
  const allFiles: UploadFile[] = [];

  // handle each folder in the config
  for (const entry of config) {
    const folder = entry.folderPath;
    const types = entry.extensions || ["jpg", "png", "tif"];

    try {
      await fs.promises.access(folder);
    } catch {
      mainWindow.webContents.send("log", {
        message: `Skipping missing folder: ${folder}`,
        type: "error" as const,
      });
      continue;
    }

    // read each file in the folder
    try {
      const files = await fs.promises.readdir(folder);
      for (const file of files) {
        const ext = path.extname(file).slice(1).toLowerCase();
        if (types.includes(ext)) {
          allFiles.push({
            path: path.join(folder, file),
            name: file,
          });
        }
      }
    } catch (err) {
      mainWindow.webContents.send("log", {
        message: `Error reading folder ${folder}: ${err}`,
        type: "error" as const,
      });
    }
  }

  // if no images to upload, send a message and return
  const totalFiles = allFiles.length;
  if (totalFiles === 0) {
    mainWindow.webContents.send("log", {
      message: "No files to upload",
      type: "info" as const,
    });
    return;
  }
  mainWindow.webContents.send("log", {
    message: `Found ${totalFiles} files to upload. Starting...`,
    type: "info" as const,
  });

  // Upload Phase (concurrently)
  const CONCURRENCY_LIMIT = 5;
  let processed = 0;

  const uploadFile = async (fileInfo: UploadFile) => {
    try {
      const stats = await fs.promises.stat(fileInfo.path);
      const buffer = await fs.promises.readFile(fileInfo.path);

      // Determine mime type based on extension
      const ext = path.extname(fileInfo.name).toLowerCase();
      let mimeType: string;
      if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".png") mimeType = "image/png";
      else if (ext === ".tif" || ext === ".tiff") mimeType = "image/tiff";
      else {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      const blob = new Blob([buffer], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, fileInfo.name);

      const response = await fetch(`${API_BASE_URL}/api/images`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        successCount++;
        totalSize += stats.size;
      } else {
        failCount++;
        let errorMessage = `Failed to upload: ${fileInfo.name}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error && errorData.error.message) {
            errorMessage = `Failed: ${fileInfo.name} - ${errorData.error.message}`;
          }
        } catch (e) {
          // If JSON parsing fails, stick to generic message or status text
          errorMessage = `Failed: ${fileInfo.name} - ${response.statusText}`;
        }
        mainWindow.webContents.send("log", {
          message: errorMessage,
          type: "error" as const,
        });
      }
    } catch (err) {
      failCount++;
      mainWindow.webContents.send("log", {
        message: `Error uploading ${fileInfo.name}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        type: "error" as const,
      });
    } finally {
      processed++;
      if (processed % 5 === 0 || processed === totalFiles) {
        mainWindow.webContents.send("log", {
          message: `Processed ${processed}/${totalFiles}`,
          type: "info" as const,
        });
      }
    }
  };

  await runConcurrent(allFiles, CONCURRENCY_LIMIT, uploadFile);

  const hasErrors = failCount > 0;
  mainWindow.webContents.send("log", {
    message: `Batch upload complete. Success: ${successCount}, Failed: ${failCount}, Total Size: ${(
      totalSize /
      1024 /
      1024
    ).toFixed(2)} MB`,
    type: hasErrors ? ("error" as const) : ("success" as const),
  });
}
