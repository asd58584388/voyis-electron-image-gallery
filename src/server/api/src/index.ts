import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "node:path";
import "dotenv/config";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";
import imagesRoutes from "./routes/images.routes.js";
import { ensureDirectoryExists } from "./utils/image.utils.js";

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_PATH = process.env.STORAGE_PATH || "/app/uploads";
const DEFAULT_THUMBNAIL_CACHE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const configuredCacheSeconds = Number(process.env.THUMBNAIL_CACHE_MAX_AGE);
const THUMBNAIL_CACHE_SECONDS = Number.isFinite(configuredCacheSeconds)
  ? configuredCacheSeconds
  : DEFAULT_THUMBNAIL_CACHE_SECONDS;

/**
 * Security middleware
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * Compression middleware
 */
app.use(compression());

/**
 * Logging middleware
 */
app.use(morgan("combined"));

/**
 * Body parsing middleware
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * API Routes
 */
app.use("/api/images", imagesRoutes);

/**
 * Static file serving for uploaded images
 */
app.use(
  "/uploads",
  express.static(STORAGE_PATH, {
    setHeaders: (res, servedPath) => {
      const normalizedPath = path.normalize(servedPath);
      if (normalizedPath.split(path.sep).includes("thumbnails")) {
        res.setHeader(
          "Cache-Control",
          `public, max-age=${THUMBNAIL_CACHE_SECONDS}, immutable`
        );
      } else {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      }
    },
  })
);

/**
 * Root endpoint
 */
app.get("/", (_req, res) => {
  res.json({
    name: "Image Editor API Server",
    version: "1.0.0",
    status: "running",
    endpoints: {
      images: "/api/images",
      uploads: "/uploads",
    },
  });
});

/**
 * 404 handler
 */
app.use(notFoundHandler);

/**
 * Error handler
 */
app.use(errorHandler);

/**
 * Initialize storage directories and start server
 */
async function startServer() {
  try {
    // Ensure storage directory exists
    await ensureDirectoryExists(STORAGE_PATH);
    console.log(`✓ Storage directory initialized: ${STORAGE_PATH}`);

    // Ensure temp upload directory exists
    const TEMP_UPLOAD_DIR = process.env.TEMP_UPLOAD_DIR || "/app/uploads/temp";
    await ensureDirectoryExists(TEMP_UPLOAD_DIR);
    console.log(`✓ Temp upload directory initialized: ${TEMP_UPLOAD_DIR}`);

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║   Image Editor API Server                              ║
║                                                        ║
║   Status: Running                                      ║
║   Port: ${PORT.toString().padEnd(44)}   ║
║   Environment: ${(process.env.NODE_ENV || "development").padEnd(38)}  ║
║   Storage: ${STORAGE_PATH.substring(0, 42).padEnd(43)} ║
║                                                        ║
║   Endpoints:                                           ║
║   - GET    /api/images                                 ║
║   - POST   /api/images                                 ║
║   - DELETE /api/images                                 ║
║   - GET    /api/images/:id                             ║
║   - POST   /api/images/:id/crop                        ║
║   - PATCH  /api/images/:id/exif                        ║
╚════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});

// Start the server
startServer();

export default app;
