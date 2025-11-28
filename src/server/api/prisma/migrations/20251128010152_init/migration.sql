-- CreateTable
CREATE TABLE "images" (
    "id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "folder_name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimetype" TEXT NOT NULL,
    "filehash" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);
