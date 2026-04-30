import { NextResponse } from "next/server";
import { getSupabaseAdmin, ArtistRow } from "@/lib/supabase";
import { formatDateToYMD } from "@/lib/date-utils";
import { serverError } from "@/lib/error-response";
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rateLimiters,
} from "@/lib/rate-limit";

type VideoPortfolioItem = {
  position: number;
  link: string;
  thumb: string;
  style_tags: string[];
};

type Artist = {
  id: string;
  name: string;
  service: string[];
  region: string[];
  price: string;
  portfolio?: string;
  image?: string;
  rating?: number;
  style_keywords?: string[];
  openchat_url?: string;
  portfolio_images?: string[];
  artist_type?: string;
  video_portfolio_items?: VideoPortfolioItem[];
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let s = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function artistRowToResponse(
  row: ArtistRow,
  items: VideoPortfolioItem[] = []
): Artist {
  return {
    id: row.id,
    name: row.name,
    service: row.service ?? [],
    region: row.region ?? [],
    price: row.price ?? "",
    portfolio: row.portfolio ?? "",
    image: row.image ?? "",
    rating: row.rating ?? 4.8,
    style_keywords: row.style_keywords ?? [],
    openchat_url: row.open_chat_url ?? "",
    portfolio_images: row.portfolio_images ?? [],
    artist_type: row.artist_type ?? "",
    video_portfolio_items: items,
  };
}

const ARTIST_COLUMNS =
  "id, name, service, region, price, portfolio, image, rating, style_keywords, open_chat_url, portfolio_images, artist_type";

async function searchArtists(
  date: string,
  region: string,
  price: string,
  services: string[],
  seed: number,
  limit: number,
  offset: number,
): Promise<{ artists: Artist[]; total: number }> {
  const supabase = getSupabaseAdmin();

  const [artistsResult, closedResult] = await Promise.all([
    supabase.from("artists").select(ARTIST_COLUMNS).order("id", { ascending: true }),
    date
      ? supabase.from("closed_dates").select("artist_id").eq("closed_date", date)
      : Promise.resolve({ data: [] as { artist_id: string }[], error: null }),
  ]);

  if (artistsResult.error) {
    throw new Error(`Supabase artists 조회 실패: ${artistsResult.error.message}`);
  }

  if (closedResult.error) {
    console.warn("closed_dates 조회 실패:", closedResult.error.message);
  }

  const closedIds = new Set<string>();
  for (const c of closedResult.data ?? []) {
    if (c.artist_id) closedIds.add(String(c.artist_id));
  }

  let rows = (artistsResult.data ?? []) as ArtistRow[];

  if (region) {
    const selected = normalizeText(region);
    rows = rows.filter((row) =>
      normalizeText((row.region ?? []).join(" ")).includes(selected)
    );
  }

  if (services.length > 0) {
    rows = rows.filter((row) => {
      const serviceText = normalizeText((row.service ?? []).join(" "));
      return services.some((s) => serviceText.includes(normalizeText(s)));
    });
  }

  if (price) {
    const selected = normalizeText(price);
    rows = rows.filter((row) => normalizeText(row.price ?? "") === selected);
  }

  if (closedIds.size > 0) {
    rows = rows.filter((row) => row.id && !closedIds.has(row.id));
  }

  rows = seededShuffle(rows, seed);
  const total = rows.length;
  rows = rows.slice(offset, offset + limit);

  const itemsByArtist = new Map<string, VideoPortfolioItem[]>();
  if (rows.length > 0) {
    const { data: videoItems, error: videoError } = await supabase
      .from("video_portfolio_items")
      .select("artist_id, position, link, thumb, style_tags")
      .in(
        "artist_id",
        rows.map((r) => r.id)
      )
      .order("position", { ascending: true });

    if (videoError) {
      console.warn("video_portfolio_items 일괄 조회 실패:", videoError.message);
    } else {
      for (const v of videoItems ?? []) {
        const arr = itemsByArtist.get(v.artist_id) ?? [];
        arr.push({
          position: v.position,
          link: v.link,
          thumb: v.thumb ?? "",
          style_tags: v.style_tags ?? [],
        });
        itemsByArtist.set(v.artist_id, arr);
      }
    }
  }

  const artists = rows.map((row) =>
    artistRowToResponse(row, itemsByArtist.get(row.id) ?? [])
  );

  return { artists, total };
}

export async function GET(request: Request) {
  try {
    const rl = await checkRateLimit(rateLimiters.search, getClientIp(request));
    if (!rl.ok) return rateLimitedResponse(rl);

    const { searchParams } = new URL(request.url);

    const date = formatDateToYMD(searchParams.get("date") || "");
    const region = searchParams.get("region") || "";
    const price = searchParams.get("price") || "";
    const services = searchParams.getAll("service");
    const seed = Math.max(1, parseInt(searchParams.get("seed") || "1"));
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "8"), 1), 50);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    const { artists, total } = await searchArtists(date, region, price, services, seed, limit, offset);

    return NextResponse.json({
      ok: true,
      artists,
      total,
      hasMore: offset + artists.length < total,
      source: "supabase",
    });
  } catch (error) {
    return serverError(
      "GET /api/search",
      error,
      "검색 중 오류가 발생했어."
    );
  }
}
