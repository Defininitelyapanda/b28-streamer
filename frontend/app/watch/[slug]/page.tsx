import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getWatchPageData } from "@/lib/catalog";
import {
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

  let initialPlayback = null;
  if (canWatch) {
    if (isFreeYoutubeVideo(video)) {
      initialPlayback = await fetchPlaybackInfo(slug);
    } else if (session?.accessToken) {
      initialPlayback = await fetchPlaybackInfo(slug, session.accessToken);
    }
  }

  return (
    <WatchClient
      video={video}
      allVideos={related}
      canWatch={canWatch}
      initialPlayback={initialPlayback}
    />
  );
}
