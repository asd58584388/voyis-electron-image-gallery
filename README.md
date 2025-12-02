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

- Start PostgreSQL and persistent `postgres_data` volume.
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

1. **No Offline Mode** – the renderer only holds gallery state in React memory.
2. **Server-Side Source of Truth** – uploads, crops, EXIF edits, duplicate checks, and thumbnail generation all execute inside the Express + Prisma stack (`images.routes.ts`). Letting the API own every write keeps metadata, storage, and the database in lockstep without dual-write logic in the client.
3. **Deterministic Recovery** – the sync button simply resets to page 1 with the default 50-item limit and replays the same API query. Because there’s no divergent local queue, a single refresh restores the UI to whatever the server currently stores.

### Potential Flaw

1. **API Hot Path Pressure** – Sharp crops, thumbnail generation, EXIF reads/writes, and duplicate hashing (MD5) all happen in the request cycle. Under heavy ingestion those CPU/IO-heavy steps can back up the server.
2. **Chatty Syncs** – because the renderer re-requests the list on every refresh and keeps no delta cache(for images list data), users on slow networks repeatedly transfer the same 50-row payloads.
3. **Residual Browser Cache** – after a delete the static `/uploads/...` asset can remain in Electron’s cache until it expires, so large TIFF previews may still occupy disk even though the DB row is gone.

## Q&A

1. What design decisions did you make to prepare for future large-scale
   data (e.g., 100k+ images)?

   1. **Pagination + Filtering Everywhere** – `/api/images` requires `page`/`limit`, caps the limit at 100, and supports folder + MIME filters, so the client never requests more than 50 rows at a time.
   2. **Concurrent IO in Electron** – both batch upload and export use `runConcurrent` with a guarded pool (default 5 workers). That keeps throughput high without overwhelming the API or filesystem.
   3. **Static Asset Caching** – thumbnails are emitted as WebP and served from `/uploads/.../thumbnails` with a month-long cache-control header, which keeps gallery rendering fast even as the dataset grows.

2. What specific optimization techniques (e.g., in the UI, API, or Database)
   would you implement to handle large-scale syncing and rendering?
   1. **UI Virtualization & Prefetching** – keep server pagination but add windowed list rendering (e.g., TanStack Virtual) plus prefetch `page + 1` to hide latency while reducing DOM weight with 100k+ assets.
   2. **Background Workers for Heavy Jobs** – move Sharp thumbnailing and EXIF rewrites to a queue/worker tier so the HTTP request returns quickly; Electron can poll for job completion.
   3. **Storage/CDN Optimization** – offload `/uploads` to object storage with CDN-backed signed URLs. That shrinks API bandwidth and lets thumbnails be served closer to users.
   4. **Database-Level Guardrails** – partition images by folder or ingestion date and add covering indexes on `folder_name`, `mimetype`, and `filehash` so scans stay fast beyond 100k rows.

## 📄 License

MIT

## 👤 Author

shuyilai

---
