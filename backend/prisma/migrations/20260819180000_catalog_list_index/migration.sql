-- CreateIndex
CREATE INDEX "catalog_videos_published_genre_sort_order_idx" ON "catalog_videos"("published", "genre", "sort_order");
