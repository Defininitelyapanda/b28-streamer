import type { CatalogVideo } from "@/lib/types";
import { classifyVideo, stableRating } from "@/lib/classify";

interface YouTubeChannelResponse {
  items?: Array<{
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
}

interface YouTubePlaylistResponse {
  items?: Array<{
    snippet?: {
      resourceId?: { videoId?: string };
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: { maxres?: { url?: string }; high?: { url?: string }; medium?: { url?: string } };
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: { maxres?: { url?: string }; high?: { url?: string }; medium?: { url?: string } };
    };
  }>;
}

async function youtubeFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  Object.entries({ ...params, key: apiKey }).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function getUploadsPlaylistId(channelId: string): Promise<string> {
  const data = await youtubeFetch<YouTubeChannelResponse>("channels", {
    part: "contentDetails",
    id: channelId,
  });

  const playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) throw new Error(`No uploads playlist found for channel ${channelId}`);
  return playlistId;
}

export async function fetchAllPlaylistVideoIds(playlistId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: "snippet",
      playlistId,
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;

    const data = await youtubeFetch<YouTubePlaylistResponse>("playlistItems", params);
    for (const item of data.items || []) {
      const id = item.snippet?.resourceId?.videoId;
      if (id) ids.push(id);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return ids;
}

export async function fetchVideoDetails(videoIds: string[]): Promise<CatalogVideo[]> {
  const videos: CatalogVideo[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const data = await youtubeFetch<YouTubeVideosResponse>("videos", {
      part: "snippet",
      id: batch.join(","),
    });

    for (const item of data.items || []) {
      const videoId = item.id;
      if (!videoId) continue;

      const snippet = item.snippet;
      const title = snippet?.title || "Untitled";
      const desc = snippet?.description || "No description available.";
      const date = (snippet?.publishedAt || new Date().toISOString()).slice(0, 10);
      const thumbnail =
        snippet?.thumbnails?.maxres?.url ||
        snippet?.thumbnails?.high?.url ||
        snippet?.thumbnails?.medium?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      const classification = classifyVideo({ id: videoId, title, desc, videoId });

      videos.push({
        id: videoId,
        videoId,
        title,
        desc: desc.slice(0, 500),
        date,
        thumbnail,
        rating: stableRating(videoId),
        sourceType: "youtube",
        ...classification,
      });
    }
  }

  return videos.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function syncFromYouTubeChannel(): Promise<CatalogVideo[]> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId) throw new Error("YOUTUBE_CHANNEL_ID is not configured");

  const uploadsPlaylistId = await getUploadsPlaylistId(channelId);
  const videoIds = await fetchAllPlaylistVideoIds(uploadsPlaylistId);
  if (!videoIds.length) throw new Error("No videos found on channel");

  return fetchVideoDetails(videoIds);
}
