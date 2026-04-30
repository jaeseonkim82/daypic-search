import { normalizeArray, joinLabel } from "@/lib/normalize";

export type VideoPortfolioItem = {
  position: number;
  link: string;
  thumb: string;
  style_tags: string[];
};

export type ArtistDetail = {
  id: string;
  name: string;
  email: string;
  service: string[] | string;
  region: string[] | string;
  price: string;
  portfolio?: string;
  image?: string;
  rating?: number | null;
  style_keywords?: string[];
  open_chat_url?: string;
  portfolio_images?: string[] | string;
  artist_type?: string;
  video_portfolio_items?: VideoPortfolioItem[];
};

export type SavedArtist = {
  id: string;
  name: string;
  service: string[];
  region: string[];
  price: string;
  portfolio?: string;
  image: string;
};

export const RECENT_STORAGE_KEY = "daypic_recent_artists";
export const FAVORITE_STORAGE_KEY = "daypic_favorite_artists";
export const FALLBACK_IMAGE = "/placeholder-artist.svg";

export function parseStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`${key} 저장 실패`, error);
  }
}

// http/https 만 통과. 다른 스킴(javascript:, data: 등)은 거부.
export function normalizeExternalUrl(url: string): string {
  const value = (url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      return "";
    }
    return "";
  }
  try {
    const parsed = new URL(`https://${value}`);
    if (parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function getVideoItems(
  artist: ArtistDetail | null
): VideoPortfolioItem[] {
  if (!artist?.video_portfolio_items) return [];
  return [...artist.video_portfolio_items].sort(
    (a, b) => a.position - b.position
  );
}

export function getVideoLinks(artist: ArtistDetail | null): string[] {
  return getVideoItems(artist)
    .map((item) => (item.link || "").trim())
    .filter(Boolean);
}

export function isVideoArtist(artist: ArtistDetail | null): boolean {
  if (!artist) return false;
  const serviceText = joinLabel(artist.service);
  const artistType = String(artist.artist_type || "");
  return (
    serviceText.includes("영상촬영") ||
    artistType.includes("영상") ||
    getVideoLinks(artist).length > 0
  );
}

export function buildSavedArtist(artist: ArtistDetail): SavedArtist {
  const firstThumb =
    getVideoItems(artist).find((item) => item.thumb)?.thumb || "";
  return {
    id: String(artist.id),
    name: artist.name,
    service: normalizeArray(artist.service),
    region: normalizeArray(artist.region),
    price: artist.price,
    portfolio: artist.portfolio,
    image: artist.image || firstThumb || FALLBACK_IMAGE,
  };
}
