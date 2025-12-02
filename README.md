# Electron Image Editor

A lightweight Electron-based desktop application for uploading, syncing, and managing image collections against a server-side database. The stack pairs a React renderer, Electron main-process workflows (batch upload/export), and an Express + PostgreSQL backend with Prisma, Sharp, and ExifTool to keep metadata authoritative.

## ✨ Features

### File Upload

- **Single Image Upload** (JPG, PNG, TIFF up to 50 MB) with immediate EXIF extraction and corrupted-file detection via ExifTool.
- **Duplicate Prevention** using MD5 hashes before persisting to disk or the database.
- **Original Filename Preservation** stored along with the hashed filename so exports retain user-facing names.
- **Automatic Thumbnails** generated as 300×300 WebP files for fast gallery rendering.

### Batch Upload (Electron Main Process)

- JSON-driven folder discovery that accepts multiple directory/extension pairs.

```json
[
  {
    "folderPath": "/Users/shuyilai/Downloads/image examples",
    "extensions": ["png", "jpg", "tif"]
  }
]
```

- Concurrent uploads (max 5 at a time) with per-file logging in the system log panel.
- Automatic MIME detection, skipped missing folders, and a detailed completion summary (success, fail, total MB).

### Gallery Viewer

- Thumbnail grid with lazy loading, pagination (50 items/page), and filters for All/JPEG/PNG/TIFF.
- Multi-select via Cmd/Ctrl + click or Shift + click, with selection badges and toolbar actions (export/delete/select all).
- Metadata summary cards that highlight type, size, dimensions.

### Single-Image Tools

- **Cropping Workflow** powered by `react-cropper`, fetch coordinate in Renderer Process, and send data. High-level concept below shows how a crop produces a new asset without touching the source.

```
Renderer UI
   ↓ (crop box)
Express API
   ↓ (Sharp crop)
Storage & Prisma
   ↓ (new asset)
Gallery Refresh
```

- **Editable EXIF Fields** (make, model, ISO, GPS, etc.) with validation, nulling support, and in-place updates that rewrite the file via ExifTool and refresh the DB record.
- Automatic TIFF → WebP preview caching.

### Control Panel & System Logs

- Upload + batch upload actions in the left panel and a collapsible bottom.
- Logs show timestamp, severity coloring, and stream updates from export/download/batch operations or renderer actions (sync, delete, etc.).
- **Sync button** resets filters, reloads page 1, and ensures the client mirrors server state.

## 📁 Project Structure

```
my-app/
├── README.md
├── src/
│   ├── client/
│   │   ├── electron/
│   │   │   ├── main.ts               # Electron entry
│   │   │   ├── handlers.ts           # IPC handlers for export/batch upload
│   │   │   └── features/
│   │   │       ├── export.ts         # Concurrent downloads + logging
│   │   │       ├── upload.ts         # JSON-driven batch uploads
│   │   │       └── utils/concurrency.ts
│   │   └── ui/
│   │       ├── components/           # LeftPanel, CenterPanel, BottomPanel, etc.
│   │       ├── context.tsx           # Gallery + log contexts
│   │       ├── hooks.ts              # Gallery state, EXIF updates, IPC logging
│   │       ├── types.ts
│   │       └── utils.ts              # Image helpers, API URLs
│   ├── server/
│   │   ├── api/
│   │   │   ├── src/
│   │   │   │   ├── index.ts          # Express bootstrap + middleware
│   │   │   │   ├── routes/           # images.routes.ts
│   │   │   │   ├── middleware/       # upload, validation, error handling
│   │   │   │   ├── utils/            # image + response helpers
│   │   │   │   ├── constants/        # Editable EXIF fields
│   │   │   │   └── lib/              # Prisma adapter
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma
│   │   │   │   └── migrations/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   └── docker-compose.yml
```

## 🚀 Getting Started

### Running the Stack

#### Step 1: Start the API + Database (Docker)

From `src/server`:

```bash
cd src/server
docker compose up --env-file .env.compose up
```

This will:

- Start PostgreSQL 18 and persistent `postgres_data` volume.
- Build the API container, install dependencies, generate the Prisma client, and run `npm run db:reset` followed by `npm run dev` .
- Mount `uploads_data` so thumbnails/originals survive container restarts.

> Need to run the API without Docker? Use `cd src/server/api && npm ci && npm run dev` after generating prisma client and apply migration file (check package.json script in /server/api) and setting a local `.env` like this:

```bash
# Application
NODE_ENV=development
PORT=3000

# Image storage path
TEMP_UPLOAD_DIR=./uploads/temp
STORAGE_PATH=./uploads

# Database Credentials
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=images_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Derived Database URL (for local dev)
DATABASE_URL=postgres://admin:admin@localhost:5432/images_db

```

#### Step 2: Run the Electron Client

From `src/client`:

```bash
cd src/client
npm ci
npm run start
```

## 🔄 Synchronization Strategy

- **Server Always Wins**: the Electron app has no client-side persistence except browser image cache; every sync hits the API for canonical data.

### Why

1. NO OFFLINE MODE – data needed to redownload after browser cache invalidate.
2. Simplicity: Avoids writing complex algorithms.

## Q&A

1. What design decisions did you make to prepare for future large-scale
   data (e.g., 100k+ images)?

   1. batch upload and batch export, export and upload images concurrently
   2. pagination, only get a small

2. What specific optimization techniques (e.g., in the UI, API, or Database)
   would you implement to handle large-scale syncing and rendering?
   1. browser Cache
   2. image list pagination

## 📄 License

MIT

## 👤 Author

shuyilai

---
