-- CreateEnum
CREATE TYPE "VideoAccessTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PlaybackFormat" AS ENUM ('YOUTUBE', 'MP4', 'HLS');

-- AlterTable
ALTER TABLE "catalog_videos" ADD COLUMN "access_tier" "VideoAccessTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "catalog_videos" ADD COLUMN "playback_format" "PlaybackFormat" NOT NULL DEFAULT 'YOUTUBE';
ALTER TABLE "catalog_videos" ADD COLUMN "storage_key" TEXT;
ALTER TABLE "catalog_videos" ADD COLUMN "duration_seconds" INTEGER;
ALTER TABLE "catalog_videos" ADD COLUMN "poster_url" TEXT;

-- CreateIndex
CREATE INDEX "catalog_videos_access_tier_idx" ON "catalog_videos"("access_tier");
