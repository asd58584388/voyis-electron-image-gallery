import { ipcMain, dialog, BrowserWindow, net } from "electron";
import fs from "fs";
import path from "path";
import { ImageFile } from "../types";

// Since we want to avoid heavy logic in the main thread, and Node's worker_threads
// are great, but for I/O bound tasks like downloading, simple concurrency control
// is often enough. However, the requirement explicitly asks for multiple threads/workers
// for future batch insertion support.
// We'll implement a worker-pool-like structure using a separate utility file
// or just process concurrency here for simplicity first, but structure it for scaling.

// Actually, for purely downloading files, Node.js async I/O is very efficient.
// Real "threads" might be overkill unless we are doing heavy image processing.
// But per requirements: "utilize multiple threads to download".
// We will simulate this by using Promise.all with a concurrency limit, which is
// effectively how Node handles "multi-threading" for I/O.
// If strict CPU threads are needed, we'd use `worker_threads`.
// Given "download", I'll stick to concurrent promises with a limit,
// as it's the standard "Node way" for network/disk I/O.

// Define base URL for API requests
const BASE_URL = "http://localhost:3000";

export function setupHandlers(mainWindow: BrowserWindow) {
  // Handle folder selection
  ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (result.canceled) {
      return undefined;
    }
    return result.filePaths[0];
  });

  // Handle export images
  ipcMain.handle(
    "export-images",
    async (event, images: ImageFile[], targetFolder: string) => {
      if (!images || images.length === 0) return;

      const CONCURRENCY_LIMIT = 5;
      let completed = 0;
      const total = images.length;

      // Helper to download a single file
      const downloadImage = async (image: ImageFile) => {
        try {
          // Construct download URL (using same logic as frontend)
          const url = `${BASE_URL}/uploads/${image.folder_name}/${image.filename}`;

          // Determine filename: use original name if available, otherwise fallback to system filename
          let filename = image.metadata?.originalName || image.filename;

          // Ensure filename is safe
          filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

          // Handle duplicates by checking if file exists
          let filePath = path.join(targetFolder, filename);
          let counter = 1;
          const nameWithoutExt = path.parse(filename).name;
          const ext = path.parse(filename).ext;

          while (fs.existsSync(filePath)) {
            filePath = path.join(
              targetFolder,
              `${nameWithoutExt}_${counter}${ext}`
            );
            counter++;
          }

          await new Promise<void>((resolve, reject) => {
            const request = net.request(url);
            request.on("response", (response) => {
              if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
              }

              const fileStream = fs.createWriteStream(filePath);
              response.on("data", (chunk) => {
                fileStream.write(chunk);
              });
              response.on("end", () => {
                fileStream.end();
                resolve();
              });
              response.on("error", (err) => {
                fileStream.close();
                reject(err);
              });
            });
            request.on("error", reject);
            request.end();
          });

          completed++;
          mainWindow.webContents.send(
            "export-progress",
            `Downloaded ${completed}/${total}: ${path.basename(filePath)}`
          );
        } catch (error) {
          console.error(`Failed to download image ${image.id}:`, error);
          mainWindow.webContents.send(
            "export-progress",
            `Failed ${image.metadata?.originalName || image.filename}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      };

      // Process with concurrency limit
      // We can use a simple queue mechanism
      const queue = [...images];
      const workers = [];

      for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, images.length); i++) {
        workers.push(
          (async () => {
            while (queue.length > 0) {
              const image = queue.shift();
              if (image) {
                await downloadImage(image);
              }
            }
          })()
        );
      }

      await Promise.all(workers);

      mainWindow.webContents.send(
        "export-complete",
        `Successfully downloaded ${completed} images to ${targetFolder}`
      );
    }
  );

  // Handle batch upload
  ipcMain.handle("batch-upload", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "JSON Config", extensions: ["json"] }],
    });

    if (result.canceled || result.filePaths.length === 0) return;

    console.log(result);
    const configPath = result.filePaths[0];
    let config: Array<{ folderPath: string; extensions: string[] }>;
    try {
      const content = await fs.promises.readFile(configPath, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        config = parsed;
      } else {
        mainWindow.webContents.send(
          "batch-upload-progress",
          "Invalid config format: expected an array"
        );
        return;
      }
    } catch (err) {
      mainWindow.webContents.send(
        "batch-upload-progress",
        "Failed to parse config file"
      );
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let totalSize = 0;
    const allFiles: { path: string; name: string }[] = [];

    // 1. Discovery Phase
    for (const entry of config) {
      const folder = entry.folderPath;
      const types = entry.extensions || ["jpg", "png", "tif"];

      try {
        await fs.promises.access(folder);
      } catch {
        mainWindow.webContents.send(
          "batch-upload-progress",
          `Skipping missing folder: ${folder}`
        );
        continue;
      }

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
        mainWindow.webContents.send(
          "batch-upload-progress",
          `Error reading folder ${folder}: ${err}`
        );
      }
    }

    const totalFiles = allFiles.length;
    if (totalFiles === 0) {
      mainWindow.webContents.send(
        "batch-upload-progress",
        "No files to upload"
      );
      return;
    }
    mainWindow.webContents.send(
      "batch-upload-progress",
      `Found ${totalFiles} files to upload. Starting...`
    );

    // 2. Upload Phase (Parallel)
    const CONCURRENCY_LIMIT = 5;
    const queue = [...allFiles];
    let processed = 0;

    const uploadFile = async (fileInfo: { path: string; name: string }) => {
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

        const response = await fetch(`${BASE_URL}/api/images`, {
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
          mainWindow.webContents.send("batch-upload-progress", errorMessage);
        }
      } catch (err) {
        failCount++;
        mainWindow.webContents.send(
          "batch-upload-progress",
          `Error uploading ${fileInfo.name}: ${err instanceof Error ? err.message : String(err)}`
        );
      } finally {
        processed++;
        if (processed % 5 === 0 || processed === totalFiles) {
          mainWindow.webContents.send(
            "batch-upload-progress",
            `Processed ${processed}/${totalFiles}`
          );
        }
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, totalFiles); i++) {
      workers.push(
        (async () => {
          while (queue.length > 0) {
            const fileInfo = queue.shift();
            if (fileInfo) {
              await uploadFile(fileInfo);
            }
          }
        })()
      );
    }

    await Promise.all(workers);

    mainWindow.webContents.send(
      "batch-upload-complete",
      `Batch upload complete. Success: ${successCount}, Failed: ${failCount}, Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`
    );
  });
}
