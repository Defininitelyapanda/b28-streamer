-- CreateTable
CREATE TABLE "catalog_videos" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "series_group" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_videos_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "catalog_videos_published_idx" ON "catalog_videos"("published");

-- CreateIndex
CREATE INDEX "catalog_videos_genre_idx" ON "catalog_videos"("genre");
