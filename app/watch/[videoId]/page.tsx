import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getRelatedVideos, getVideoById } from "@/lib/catalog-utils";
import WatchClient from "@/components/watch/WatchClient";

interface WatchPageProps {
  params: Promise<{ videoId: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { videoId } = await params;
  const catalog = await getCatalog();
  const video = getVideoById(catalog.videos, videoId);

  if (!video) return { title: "Not Found | B28 Entertainment" };

  return {
    title: `${video.title} | B28 Entertainment`,
    description: video.desc,
    openGraph: {
      title: video.title,
      description: video.desc,
      images: [{ url: video.thumbnail }],
    },
  };
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { videoId } = await params;
  const catalog = await getCatalog();
  const video = getVideoById(catalog.videos, videoId);

  if (!video) notFound();

  const related = getRelatedVideos(catalog.videos, video);

  return <WatchClient video={video} allVideos={[...related, ...catalog.videos]} />;
}
