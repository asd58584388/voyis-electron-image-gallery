# Electron Image Editor

A lightweight Electron-based desktop application for uploading, syncing, and managing images with a server-side database. Built with React, TypeScript, Express.js, and PostgreSQL.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [Usage Guide](#usage-guide)
- [Architecture Overview](#architecture-overview)
- [Synchronization Strategy](#synchronization-strategy)
- [API Documentation](#api-documentation)
- [Performance & Scalability](#performance--scalability)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### File Upload

- **Single File Upload**: Upload individual images (JPG, PNG, TIFF) with real-time feedback
- **Batch Upload**: Upload multiple images from folders using JSON configuration
- **Image Validation**: Automatic detection of corrupted images before upload
- **Duplicate Detection**: Prevents duplicate uploads using file hash comparison
- **Upload Feedback**: Displays total file count, file size, and corrupted image count

### Gallery Viewer

- **Thumbnail Gallery**: Grid view with pagination (50 images per page)
- **File Filtering**: Filter images by type (All, JPEG, PNG, TIFF)
- **Custom Selection**: Single or multi-select images (Ctrl/Cmd + Click, Shift + Click)
- **Batch Export**: Export selected images to a local folder
- **Image Metadata**: View file name, size, dimensions, and upload date

### Single-Image Viewer

- **Full-Screen View**: Double-click any thumbnail to view in single-image mode
- **Image Cropping**: Select and crop areas to create new images
- **Pan & Zoom**: Browser-native image viewing with zoom capabilities
- **Area Selection**: Interactive cropping interface using react-cropper

### Control Panel

- **Synchronization**: Sync local application with server database
- **System Logs**: Real-time logging of user actions and system feedback
- **Metadata Display**: View detailed image information in the left panel

## 🛠 Technology Stack

### Frontend

- **Framework**: React 19 with TypeScript
- **Desktop**: Electron 39.2.2
- **Styling**: Tailwind CSS 4.1.17
- **Image Cropping**: react-cropper 2.3.3
- **Build Tool**: Electron Forge with Vite

### Backend

- **Runtime**: Node.js 24
- **Framework**: Express.js 5.1.0
- **Database**: PostgreSQL 18 (Docker)
- **ORM**: Prisma 7.0.1
- **Image Processing**: Sharp 0.33.5 (WASM-based)
- **File Upload**: Multer 2.0.2

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL with health checks
- **Storage**: Mounted volumes for persistent data

## 📁 Project Structure

```
my-app/
├── src/
│   ├── client/                 # Electron application
│   │   ├── electron/
│   │   │   ├── main.ts         # Main Electron process
│   │   │   ├── preload.ts      # Preload script for IPC
│   │   │   └── exportHandlers.ts  # Batch export/upload handlers
│   │   └── ui/                 # React frontend
│   │       ├── components/
│   │       │   ├── App.tsx     # Main application component
│   │       │   ├── LeftPanel.tsx    # Upload & metadata panel
│   │       │   ├── CenterPanel.tsx  # Gallery & single view
│   │       │   └── BottomPanel.tsx   # System logs
│   │       ├── hooks.ts        # Custom React hooks
│   │       └── utils.ts        # Utility functions
│   │
│   └── server/                 # Backend server
│       ├── api/                # API server
│       │   ├── src/
│       │   │   ├── index.ts    # Express server setup
│       │   │   ├── routes/     # API routes
│       │   │   ├── middleware/ # Express middleware
│       │   │   └── utils/      # Utility functions
│       │   ├── prisma/         # Database schema & migrations
│       │   └── Dockerfile      # API container definition
│       └── docker-compose.yml  # Docker services configuration
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ (recommended: 24)
- **npm** 9+ or **yarn**
- **Docker** 20.10+ and **Docker Compose** 2.0+
- **Git**

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd my-app
```

### 2. Set Up Server Environment

Navigate to the server API directory:

```bash
cd src/server/api
```

Create a `.env` file (for local development) or `.env.docker` (for Docker):

```bash
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=image_editor
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/image_editor

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Storage Configuration
STORAGE_PATH=./uploads
TEMP_UPLOAD_DIR=./uploads/temp
```

### 3. Install Server Dependencies

```bash
cd src/server/api
npm install
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Set Up Client Environment

Navigate to the client directory:

```bash
cd ../../client
```

Install client dependencies:

```bash
npm install
```

## 🏃 Running the Application

### Step 1: Start the Server-Side Environment

From the `src/server` directory, start Docker services:

```bash
cd src/server
docker-compose up -d
```

This will:

- Start PostgreSQL database container
- Build and start the API server container
- Run database migrations automatically
- Mount persistent volumes for uploads and database data

**Verify the server is running:**

```bash
# Check container status
docker-compose ps

# View API server logs
docker-compose logs -f api

# Test API root endpoint
curl http://localhost:3000/
```

The API server should be accessible at `http://localhost:3000`.

### Step 2: Run the Electron Application

From the `src/client` directory:

```bash
cd src/client
npm start
```

This will:

- Start the Vite development server
- Launch the Electron application window
- Open DevTools automatically (for debugging)

**For production build:**

```bash
npm run package  # Package the application
npm run make     # Create distributables
```

## 📖 Usage Guide

### Uploading Images

#### Single File Upload

1. Click **"Upload Image"** in the left panel
2. Select an image file (JPG, PNG, or TIFF)
3. The image will be validated, processed, and added to the gallery
4. Upload progress and results are logged in the bottom panel

#### Batch Upload

1. Create a JSON configuration file with the following format:

```json
[
  {
    "folderPath": "/path/to/images",
    "extensions": ["jpg", "png", "tif"]
  },
  {
    "folderPath": "/path/to/more/images",
    "extensions": ["jpg", "jpeg"]
  }
]
```

2. Click **"Batch Upload"** in the left panel
3. Select your JSON configuration file
4. The application will discover and upload all matching files
5. Progress is displayed in real-time in the system logs

### Viewing Images

#### Gallery View

- **Filter**: Use the dropdown to filter by image type (All, JPEG, PNG, TIFF)
- **Select**: Click to select, Ctrl/Cmd+Click for multi-select, Shift+Click for range
- **Navigate**: Use pagination controls to browse through pages (50 images per page)
- **View Details**: Click on a thumbnail to view metadata in the left panel

#### Single-Image View

- **Open**: Double-click any thumbnail to open in single-image view
- **Crop**: Click "Crop Image" to enter cropping mode
  - Drag to select area
  - Adjust selection handles
  - Click "Save Crop" to create a new cropped image
- **Back**: Click "← Back to Gallery" to return to gallery view

### Exporting Images

1. Select one or more images in the gallery view
2. Click **"Export Selected"** in the toolbar
3. Choose a destination folder
4. Images will be downloaded with their original filenames
5. Progress is shown in the system logs

### Synchronization

Click the **"Sync"** button in the toolbar to:

- Reset all filters
- Refresh the gallery with the latest images from the server
- Update the local view to match server state

## 🏗 Architecture Overview

### Client-Server Communication

The application follows a client-server architecture:

```
┌─────────────────┐         HTTP/REST API         ┌──────────────────┐
│  Electron App   │ ◄─────────────────────────────► │   Express API     │
│  (React UI)     │                                 │   (Node.js)       │
└─────────────────┘                                 └──────────────────┘
                                                             │
                                                             │ Prisma ORM
                                                             ▼
                                                      ┌──────────────┐
                                                      │  PostgreSQL  │
                                                      │  (Docker)    │
                                                      └──────────────┘
```

### Data Flow

1. **Upload Flow**:

   - User selects file → Electron main process → API server
   - Server validates, processes, generates thumbnail
   - Image stored in filesystem, metadata saved to database
   - Response sent back to client

2. **View Flow**:

   - Client requests images with pagination/filters
   - Server queries database, returns metadata
   - Client requests image files via static file serving
   - Thumbnails served with aggressive caching

3. **Export Flow**:
   - User selects images → Electron IPC → Main process
   - Main process downloads files concurrently (5 at a time)
   - Progress updates sent via IPC to renderer
   - Files saved to user-selected folder

### Image Processing Pipeline

```
Uploaded File
    ↓
[Validation] → Corrupted? → Reject
    ↓
[Hash Calculation] → Duplicate? → Reject
    ↓
[Metadata Extraction] → Sharp library
    ↓
[Thumbnail Generation] → WebP format (300x300)
    ↓
[File Storage] → Organized by folder
    ↓
[Database Record] → Prisma create
```

## 🔄 Synchronization Strategy

### Chosen Strategy: **Server Always Wins**

The application uses a **"Server Always Wins"** synchronization strategy.

#### How It Works

1. **Sync Operation**: When the user clicks "Sync", the client:

   - Resets all local filters
   - Fetches the latest image list from the server
   - Updates the local gallery view

2. **No Local State Persistence**: The client does not maintain persistent local state. All data is fetched from the server on demand.

3. **Conflict Resolution**: Since there's no local database or persistent state, conflicts don't occur. The server is the single source of truth.

#### Rationale

- **Simplicity**: No need for complex conflict resolution logic
- **Data Integrity**: Server always has the authoritative state
- **Real-time Updates**: Multiple clients see the same data
- **No Data Loss**: Server-side changes are never overwritten

#### Potential Flaws & Risks

1. **Network Dependency**:

   - **Risk**: Application requires network connectivity to function
   - **Mitigation**: Error handling and user feedback for network issues

2. **No Offline Support**:

   - **Risk**: Cannot view images when server is unavailable
   - **Mitigation**: This is acceptable for a server-centric application

3. **Performance with Large Datasets**:

   - **Risk**: Fetching all images on sync could be slow
   - **Mitigation**: Pagination limits data transfer (50 images per page)

4. **Concurrent Modifications**:

   - **Risk**: If two users modify the same image simultaneously, last write wins at the database level
   - **Mitigation**: Soft deletes preserve data; timestamps track modifications

5. **No Undo/Redo**:
   - **Risk**: Deleted images cannot be recovered from client
   - **Mitigation**: Soft deletes allow server-side recovery

## 📡 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### Health Check

**Note**: A health check route file exists (`health.routes.ts`) but is not currently registered in the server. To enable it, add `app.use("/api/health", healthRoutes)` to `src/server/api/src/index.ts`.

```http
GET /api/health
```

**Response (when enabled):**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.45,
    "database": "connected"
  }
}
```

#### List Images

```http
GET /api/images?page=1&limit=50&mimetype=image/jpeg&folder_name=default
```

**Query Parameters:**

- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `mimetype` (string, optional): Filter by MIME type
- `folder_name` (string, optional): Filter by folder
- `include_deleted` (boolean, optional): Include soft-deleted images

**Response:**

```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "total": 150,
    "page": 1,
    "limit": 50
  }
}
```

#### Upload Image

```http
POST /api/images
Content-Type: multipart/form-data
```

**Form Data:**

- `file` (File): Image file (JPG, PNG, TIFF)
- `folder_name` (string, optional): Target folder (default: "default")

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "hash_timestamp.jpg",
    "path": "/app/uploads/default/hash_timestamp.jpg",
    "thumbnail_path": "/app/uploads/default/thumbnails/thumb_hash_timestamp.webp",
    "size": 1234567,
    "mimetype": "image/jpeg",
    "metadata": {...}
  }
}
```

#### Get Image File

```http
GET /api/images/:id
```

**Response:** Image file stream (with appropriate Content-Type)

#### Crop Image

```http
POST /api/images/:id/crop
Content-Type: application/json
```

**Request Body:**

```json
{
  "x": 100,
  "y": 100,
  "width": 500,
  "height": 500
}
```

**Response:** New cropped image object (same structure as upload response)

#### Delete Image (Single)

```http
DELETE /api/images/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Image deleted successfully",
    "id": "uuid",
    "deleted_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Delete Images (Batch)

```http
DELETE /api/images
Content-Type: application/json
```

**Request Body:**

```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "3 images deleted successfully",
    "count": 3
  }
}
```

## ⚡ Performance & Scalability

### Design Decisions for Large-Scale Data (100k+ Images)

#### 1. **Pagination**

- **Implementation**: Server-side pagination with 50 images per page
- **Benefit**: Reduces initial load time and memory usage
- **Scalability**: Constant memory usage regardless of total image count

#### 2. **Thumbnail Generation**

- **Implementation**: Pre-generated WebP thumbnails (300x300) stored on disk
- **Benefit**: Fast gallery loading without processing full images
- **Scalability**: Thumbnails generated once, served many times

#### 3. **Lazy Loading**

- **Implementation**: Browser-native lazy loading for gallery thumbnails
- **Benefit**: Only loads visible images, reduces bandwidth
- **Scalability**: Linear scaling with viewport size

#### 4. **Image Caching**

- **Implementation**: Aggressive HTTP caching for thumbnails (30 days)
- **Benefit**: Reduces server load and improves response times
- **Scalability**: CDN-ready caching strategy

#### 5. **Database Indexing**

- **Implementation**: Prisma schema with indexed fields (id, filehash, deleted_at)
- **Benefit**: Fast queries even with millions of records
- **Scalability**: Database indexes scale logarithmically

#### 6. **Concurrent Processing**

- **Implementation**: Batch operations use worker pool (5 concurrent operations)
- **Benefit**: Parallel processing without overwhelming server
- **Scalability**: Configurable concurrency limits

### Optimization Techniques for Future Scale

#### UI Optimizations

1. **Virtual Scrolling**: Implement react-window or react-virtualized for gallery view
2. **Image Placeholders**: Show skeleton loaders while images load
3. **Progressive Image Loading**: Load low-quality placeholders first, then full images
4. **Debounced Search**: Delay filter/search operations to reduce API calls

#### API Optimizations

1. **Response Compression**: Already implemented (gzip compression)
2. **Database Query Optimization**:
   - Add composite indexes for common filter combinations
   - Implement cursor-based pagination for better performance
   - Use database connection pooling
3. **Caching Layer**: Add Redis for frequently accessed data
4. **CDN Integration**: Serve images via CDN for global distribution
5. **Image Optimization**: Implement automatic image compression on upload

#### Database Optimizations

1. **Partitioning**: Partition images table by folder_name or date
2. **Archiving**: Move old/deleted images to archive tables
3. **Full-Text Search**: Add PostgreSQL full-text search for metadata
4. **Read Replicas**: Use read replicas for gallery queries

#### Storage Optimizations

1. **Object Storage**: Migrate to S3-compatible storage (MinIO, AWS S3)
2. **Image Formats**: Convert all images to WebP for storage efficiency
3. **Deduplication**: Leverage filehash for storage deduplication
4. **Compression**: Compress original images with lossless compression

## 🛠 Development

### Development Scripts

#### Client

```bash
cd src/client
npm start          # Start development server
npm run package    # Package for distribution
npm run make       # Create installers
npm run lint       # Run ESLint
```

#### Server

```bash
cd src/server/api
npm run dev        # Start development server with hot reload
npm run build      # Build TypeScript
npm run start      # Start production server
npm run db:migrate # Run database migrations
npm run db:generate # Generate Prisma client
npm run db:studio  # Open Prisma Studio (database GUI)
```

### Database Management

#### Access Prisma Studio

```bash
cd src/server/api
npm run db:studio
```

#### Create Migration

```bash
cd src/server/api
npx prisma migrate dev --name migration_name
```

#### Reset Database

```bash
cd src/server/api
npx prisma migrate reset
```

### Environment Variables

#### Server (.env or .env.docker)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=image_editor

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Storage
STORAGE_PATH=/app/uploads
TEMP_UPLOAD_DIR=/app/uploads/temp
THUMBNAIL_CACHE_MAX_AGE=2592000
```

## 🐛 Troubleshooting

### Server Issues

#### Database Connection Failed

```bash
# Check if PostgreSQL container is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Restart services
docker-compose restart
```

#### Port Already in Use

```bash
# Change PORT in .env file or docker-compose.yml
# Or stop the process using the port
lsof -ti:3000 | xargs kill -9
```

#### Migration Errors

```bash
# Reset database (WARNING: deletes all data)
cd src/server/api
npx prisma migrate reset

# Or manually fix migration
npx prisma migrate dev
```

### Client Issues

#### Electron Window Not Opening

- Check if Vite dev server is running
- Verify `MAIN_WINDOW_VITE_DEV_SERVER_URL` is set
- Check console for errors

#### Images Not Loading

- Verify API server is running at `http://localhost:3000`
- Check CORS settings in server
- Verify image files exist in uploads directory
- Check browser DevTools Network tab

#### Batch Upload Fails

- Verify JSON config file format is correct
- Check folder paths are absolute and accessible
- Verify file extensions match supported types
- Check system logs in bottom panel

### Common Issues

#### Dockerfile vs docker-compose Command

The Dockerfile specifies `CMD ["npm", "run", "dev"]`, but docker-compose.yml overrides this with `command: sh -c "npm run db:migrate && npm run start"`. This is intentional - the docker-compose command takes precedence and ensures migrations run before starting the server.

#### "Cannot find module" Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Docker Issues

```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Permission Errors (Linux/Mac)

```bash
# Fix upload directory permissions
chmod -R 755 src/server/api/uploads
```

## 📝 Notes

- **Image Quality**: Supports 4K images (tested with images up to 3840x2160)
- **Supported Formats**: JPEG, PNG, TIFF
- **Thumbnail Format**: WebP (for optimal compression)
- **Database**: Uses soft deletes (images marked as deleted, not removed)
- **File Naming**: Uses hash + timestamp for unique filenames
- **Duplicate Detection**: MD5 hash comparison prevents duplicate uploads

## 📄 License

MIT

## 👤 Author

shuyilai

---

**Note**: This project was developed as an evaluation project for a full-stack Electron application. For questions or clarifications, please refer to the project requirements document or contact the project evaluator.
