import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getWatchPageData } from "@/lib/catalog";
import {
  buildCatalogPlayback,
  canWatchVideo,
  isFreeYoutubeVideo,
  resolveWatchDestination,
} from "@/lib/streaming-access";
import { fetchPlaybackInfo } from "@/lib/streaming-server";
import WatchClient from "@/components/watch/WatchClient";

interface WatchPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { video } = await getWatchPageData(slug);

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
  const { slug } = await params;
  const { video, related, session } = await getWatchPageData(slug);

  if (!video) notFound();

  const roles = session?.user?.roles ?? [];
  const watchPath = `/watch/${encodeURIComponent(slug)}`;
  const canWatch = canWatchVideo(video, session?.subscription, roles);
  const upsellDestination = canWatch ? null : resolveWatchDestination(session?.subscription, roles, watchPath);
  if (upsellDestination) redirect(upsellDestination);

  const initialPlayback = isFreeYoutubeVideo(video)
    ? buildCatalogPlayback(video)
    : canWatch && session?.accessToken
      ? await fetchPlaybackInfo(slug, session.accessToken)
      : null;

  return (
    <WatchClient
      video={video}
      allVideos={related}
      canWatch={canWatch}
      initialPlayback={initialPlayback}
    />
  );
}
