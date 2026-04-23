import { NextResponse } from "next/server";
import { getSupabaseAdmin, ArtistRow } from "@/lib/supabase";
import { formatDateToYMD } from "@/lib/date-utils";
import { serverError } from "@/lib/error-response";

type VideoPortfolioItem = {
  position: number;
  link: string;
  thumb: string;
  style_tags: string[];
};

type Artist = {
  id: string;
  artist_id: string;
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

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
    artist_id: row.artist_id ?? "",
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

async function searchArtists(
  date: string,
  region: string,
  price: string,
  services: string[]
): Promise<Artist[]> {
  const supabase = getSupabaseAdmin();

  const { data: artists, error } = await supabase.from("artists").select("*");

  if (error) {
    throw new Error(`Supabase artists 조회 실패: ${error.message}`);
  }

  let rows = (artists ?? []) as ArtistRow[];

  if (region) {
    const selected = normalizeText(region);
    rows = rows.filter((row) => {
      const regionText = normalizeText((row.region ?? []).join(" "));
      return regionText.includes(selected);
    });
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

  if (date) {
    const { data: closed, error: closedError } = await supabase
      .from("closed_dates")
      .select("artist_id")
      .eq("closed_date", date);

    if (closedError) {
      console.warn("closed_dates 조회 실패:", closedError.message);
    } else {
      const closedIds = new Set<string>();
      for (const c of closed ?? []) {
        if (c.artist_id) closedIds.add(String(c.artist_id));
      }
      rows = rows.filter((row) => {
        if (row.id && closedIds.has(row.id)) return false;
        if (row.artist_id && closedIds.has(row.artist_id)) return false;
        return true;
      });
    }
  }

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
      console.warn(
        "video_portfolio_items 일괄 조회 실패:",
        videoError.message
      );
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

  return rows.map((row) =>
    artistRowToResponse(row, itemsByArtist.get(row.id) ?? [])
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const date = formatDateToYMD(searchParams.get("date") || "");
    const region = searchParams.get("region") || "";
    const price = searchParams.get("price") || "";
    const services = searchParams.getAll("service");

    const artists = await searchArtists(date, region, price, services);
    const shuffled = shuffle(artists);

    return NextResponse.json({
      ok: true,
      artists: shuffled,
      total: shuffled.length,
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
