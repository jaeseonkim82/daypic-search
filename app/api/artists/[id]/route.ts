import { NextRequest, NextResponse } from "next/server";

type AirtableFieldValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, any>
  | Array<any>;

type AirtableRecord = {
  id: string;
  fields: Record<string, AirtableFieldValue>;
};

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ARTISTS_TABLE =
  process.env.AIRTABLE_ARTISTS_TABLE || "tbl8u1fnfNfTzMhyI";

function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();

        if (
          item &&
          typeof item === "object" &&
          "name" in item &&
          typeof (item as { name?: unknown }).name === "string"
        ) {
          return String((item as { name: string }).name).trim();
        }

        if (
          item &&
          typeof item === "object" &&
          "url" in item &&
          typeof (item as { url?: unknown }).url === "string"
        ) {
          return String((item as { url: string }).url).trim();
        }

        if (
          item &&
          typeof item === "object" &&
          "secure_url" in item &&
          typeof (item as { secure_url?: unknown }).secure_url === "string"
        ) {
          return String((item as { secure_url: string }).secure_url).trim();
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePortfolioImages(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();

        if (
          item &&
          typeof item === "object" &&
          "url" in item &&
          typeof (item as { url?: unknown }).url === "string"
        ) {
          return String((item as { url: string }).url).trim();
        }

        if (
          item &&
          typeof item === "object" &&
          "secure_url" in item &&
          typeof (item as { secure_url?: unknown }).secure_url === "string"
        ) {
          return String((item as { secure_url: string }).secure_url).trim();
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function pickImage(fields: Record<string, AirtableFieldValue>): string {
  const candidates = [
    fields["image"],
    fields["대표사진"],
    fields["대표이미지"],
    fields["대표 사진"],
    fields["profile_image"],
    fields["thumbnail"],
  ];

  for (const value of candidates) {
    if (!value) continue;

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];

      if (typeof first === "string" && first.trim()) {
        return first.trim();
      }

      if (
        first &&
        typeof first === "object" &&
        "url" in first &&
        typeof (first as { url?: unknown }).url === "string"
      ) {
        return String((first as { url: string }).url).trim();
      }

      if (
        first &&
        typeof first === "object" &&
        "thumbnails" in first &&
        typeof (first as { thumbnails?: unknown }).thumbnails === "object" &&
        (first as any).thumbnails?.large?.url
      ) {
        return String((first as any).thumbnails.large.url).trim();
      }
    }
  }

  return "";
}

function pickAttachmentUrl(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];

    if (typeof first === "string" && first.trim()) {
      return first.trim();
    }

    if (
      first &&
      typeof first === "object" &&
      "url" in first &&
      typeof (first as { url?: unknown }).url === "string"
    ) {
      return String((first as { url: string }).url).trim();
    }

    if (
      first &&
      typeof first === "object" &&
      "thumbnails" in first &&
      typeof (first as { thumbnails?: unknown }).thumbnails === "object" &&
      (first as any).thumbnails?.large?.url
    ) {
      return String((first as any).thumbnails.large.url).trim();
    }
  }

  return "";
}

function mapArtistRecord(record: AirtableRecord) {
  const fields = record.fields ?? {};

  const service = normalizeStringArray(
    fields["service"] ?? fields["촬영서비스"]
  );

  const region = normalizeStringArray(
    fields["region"] ?? fields["촬영지역"]
  );

  const keywords = normalizeStringArray(
    fields["keywords"] ?? fields["성향키워드"]
  );

  const portfolioImages = normalizePortfolioImages(fields["portfolio_images"]);

  const videoLinks = [
    pickFirstString(fields["video_link_1"]),
    pickFirstString(fields["video_link_2"]),
    pickFirstString(fields["video_link_3"]),
    pickFirstString(fields["video_link_4"]),
  ].filter(Boolean);

  const videoThumbnail = pickAttachmentUrl(fields["video_thumbnail"]);

  return {
    id: record.id,
    name: pickFirstString(
      fields["업체명"],
      fields["name"],
      fields["작가명"],
      fields["작가 또는 업체명"],
      fields["artist_name"]
    ),
    email: pickFirstString(fields["email"], fields["이메일"]),
    service,
    region,
    price: pickFirstString(
      fields["price"],
      fields["촬영비용"],
      fields["예산"],
      fields["budget"]
    ),
    portfolio: pickFirstString(
      fields["portfolio"],
      fields["portfolio_url"],
      fields["포트폴리오"]
    ),
    image: pickImage(fields),
    rating:
      typeof fields["rating"] === "number"
        ? fields["rating"]
        : typeof fields["평점"] === "number"
        ? fields["평점"]
        : null,
    keywords,
    성향키워드: keywords,
    openchat_url: pickFirstString(
      fields["openchat_url"],
      fields["오픈채팅"],
      fields["카카오톡 문의"],
      fields["카톡문의"]
    ),
    portfolio_images: portfolioImages,

    // ✅ 영상 관련
    artist_type: pickFirstString(fields["artist_type"]),
    video_link_1: pickFirstString(fields["video_link_1"]),
    video_link_2: pickFirstString(fields["video_link_2"]),
    video_link_3: pickFirstString(fields["video_link_3"]),
    video_link_4: pickFirstString(fields["video_link_4"]),
    video_links: videoLinks,
    video_thumbnail: videoThumbnail,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable 환경변수가 설정되지 않았어요." },
        { status: 500 }
      );
    }

    const resolvedParams = await Promise.resolve(context.params);
    const artistId = String(resolvedParams?.id || "").trim();

    if (!artistId) {
      return NextResponse.json(
        { error: "작가 id가 없어요." },
        { status: 400 }
      );
    }

    const encodedTable = encodeURIComponent(ARTISTS_TABLE);
    const encodedRecordId = encodeURIComponent(artistId);

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTable}/${encodedRecordId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.status === 404) {
      return NextResponse.json(
        { error: "해당 작가를 찾을 수 없어요." },
        { status: 404 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Airtable에서 작가 정보를 가져오지 못했어요.",
          detail: errorText,
        },
        { status: response.status }
      );
    }

    const record = (await response.json()) as AirtableRecord;
    const artist = mapArtistRecord(record);

    return NextResponse.json(artist, { status: 200 });
  } catch (error) {
    console.error("GET /api/artists/[id] error:", error);

    return NextResponse.json(
      { error: "작가 상세 정보를 불러오는 중 오류가 발생했어요." },
      { status: 500 }
    );
  }
}