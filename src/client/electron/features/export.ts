import { net, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import { ImageFile, IPCMessage } from "../../types";
import { runConcurrent } from "../utils/concurrency";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

export async function handleExportImages(
  mainWindow: BrowserWindow,
  images: ImageFile[],
  targetFolder: string
) {
  if (!images || images.length === 0) return;

  const CONCURRENCY_LIMIT = 5;
  let completed = 0;
  const total = images.length;

  // Helper to download a single file
  const downloadImage = async (image: ImageFile) => {
    try {
      // Construct download URL (using same logic as frontend)
      const url = `${API_BASE_URL}/uploads/${image.folder_name}/${image.filename}`;

      // Determine filename: use original name if available, otherwise fallback to default naming
      let filename =
        image.originalName || `default${path.extname(image.filename)}`;

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
            const error: IPCMessage = {
              message: `Failed to download: ${response.statusCode}`,
              type: "error",
            };
            reject(error);
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
      mainWindow.webContents.send("log", {
        message: `Downloaded ${completed}/${total}: ${path.basename(filePath)}`,
        type: "info" as const,
      });
    } catch (error) {
      let errorMessage = "Unknown error";
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        "type" in error
      ) {
        errorMessage = (error as IPCMessage).message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      mainWindow.webContents.send("log", {
        message: `Failed ${image.originalName || image.filename}: ${errorMessage}`,
        type: "error" as const,
      });
    }
  };

  await runConcurrent(images, CONCURRENCY_LIMIT, downloadImage);

  mainWindow.webContents.send("log", {
    message: `Successfully downloaded ${completed} images to ${targetFolder}`,
    type: "success" as const,
  });
}
