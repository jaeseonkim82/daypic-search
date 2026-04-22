import { NextResponse } from "next/server";
import { getSupabaseAdmin, ArtistRow } from "@/lib/supabase";

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
  email: string;
  service: string[];
  region: string[];
  price: string;
  portfolio?: string;
  image?: string;
  rating?: number;
  keywords?: string[];
  openchat_url?: string;
  portfolio_images?: string[];
  video_link_1?: string;
  video_link_2?: string;
  video_link_3?: string;
  video_link_4?: string;
  video_thumbnail?: string;
  artist_type?: string;
  video_portfolio_items?: VideoPortfolioItem[];
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function formatDateToYMD(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value.includes("T")) return value.split("T")[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.trim();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function artistRowToResponse(row: ArtistRow): Artist {
  return {
    id: row.id,
    artist_id: row.artist_id ?? "",
    name: row.name,
    email: row.email ?? "",
    service: row.service ?? [],
    region: row.region ?? [],
    price: row.price ?? "",
    portfolio: row.portfolio ?? "",
    image: row.image ?? "",
    rating: row.rating ?? 4.8,
    // @deprecated 클라이언트가 style_keywords로 전환하면 이 별칭 제거
    keywords: row.style_keywords ?? [],
    openchat_url: row.open_chat_url ?? "",
    portfolio_images: row.portfolio_images ?? [],
    video_link_1: row.video_link_1 ?? "",
    video_link_2: row.video_link_2 ?? "",
    video_link_3: row.video_link_3 ?? "",
    video_link_4: row.video_link_4 ?? "",
    video_thumbnail: row.video_thumbnail ?? "",
    artist_type: row.artist_type ?? "",
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

  return rows.map((row) => ({
    ...artistRowToResponse(row),
    video_portfolio_items: itemsByArtist.get(row.id) ?? [],
  }));
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
    console.error("Search API error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "검색 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}
