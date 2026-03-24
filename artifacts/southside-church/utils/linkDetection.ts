const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

const TRAILING_PUNCT = /[.,;:!?)]+$/;

export type LinkType = "youtube" | "vimeo" | "link";

export interface DetectedLink {
  url: string;
  type: LinkType;
  embedUrl?: string;
}

function cleanUrl(raw: string): string {
  return raw.replace(TRAILING_PUNCT, "");
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIMEO_HOSTS = new Set([
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

function extractYouTubeId(url: string): string | null {
  const host = getHostname(url);
  if (!YOUTUBE_HOSTS.has(host)) return null;

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const host = getHostname(url);
  if (!VIMEO_HOSTS.has(host)) return null;

  const patterns = [
    /vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/(\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function detectFirstLink(text: string): DetectedLink | null {
  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0) return null;

  const url = cleanUrl(matches[0]);

  const ytId = extractYouTubeId(url);
  if (ytId) {
    return {
      url,
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${ytId}?playsinline=1`,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      url,
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return { url, type: "link" };
}

export function extractAllUrls(text: string): string[] {
  const raw = text.match(URL_REGEX) || [];
  return raw.map(cleanUrl);
}
