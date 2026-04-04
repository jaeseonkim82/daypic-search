import { NextResponse } from "next/server";

type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type Artist = {
  id: string;
  name: string;
  email: string;
  service: string[] | string;
  region: string[] | string;
  price: string;
  portfolio?: string;
  image?: string;
  rating?: number;
  keywords?: string[];
  openchat_url?: string;
  portfolio_images?: string[] | string;

  // ✅ 영상 관련 필드 추가
  video_link_1?: string;
  video_link_2?: string;
  video_link_3?: string;
  video_link_4?: string;
  video_thumbnail?: string;
  artist_type?: string;
};

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";
const CLOSED_DATES_TABLE =
  process.env.AIRTABLE_CLOSED_DATES_TABLE || "closed_dates";

function pickImage(fields: Record<string, unknown>): string {
  const candidates = [
    fields["대표사진"],
    fields["대표이미지"],
    fields["대표 이미지"],
    fields["image"],
    fields["thumbnail"],
  ];

  for (const value of candidates) {
    if (!value) continue;

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];

      if (typeof first === "string") return first.trim();

      if (first && typeof first === "object" && "url" in first) {
        return String((first as { url?: unknown }).url || "").trim();
      }

      if (
        first &&
        typeof first === "object" &&
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

    if (first && typeof first === "object" && "url" in first) {
      return String((first as { url?: unknown }).url || "").trim();
    }

    if (
      first &&
      typeof first === "object" &&
      (first as any).thumbnails?.large?.url
    ) {
      return String((first as any).thumbnails.large.url).trim();
    }
  }

  return "";
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

function toStringValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }

  if (value == null) return "";
  return String(value).trim();
}

function normalizeText(value: string): string {
  return value.replace(/\s/g, "").trim().toLowerCase();
}

function getField(
  fields: Record<string, unknown>,
  candidates: string[]
): unknown {
  for (const key of candidates) {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== "") {
      return fields[key];
    }
  }
  return undefined;
}

function formatDateToYMD(value: string): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.trim();
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function makeDateKey(email: string, date: string): string {
  const normalizedEmail = normalizeText(email);
  const normalizedDate = formatDateToYMD(date);

  if (!normalizedEmail || !normalizedDate) return "";
  return `${normalizedEmail}_${normalizedDate}`;
}

async function fetchAirtableRecords(tableName: string): Promise<AirtableRecord[]> {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    throw new Error("Airtable 환경변수가 설정되지 않았어.");
  }

  const encodedTableName = encodeURIComponent(tableName);
  let offset = "";
  const allRecords: AirtableRecord[] = [];

  while (true) {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTableName}`
    );

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Airtable 요청 실패 (${response.status}): ${errorText || "응답 없음"}`
      );
    }

    const data = (await response.json()) as {
      records?: AirtableRecord[];
      offset?: string;
    };

    allRecords.push(...(data.records || []));

    if (!data.offset) break;
    offset = data.offset;
  }

  return allRecords;
}

function buildArtists(records: AirtableRecord[]): Artist[] {
  return records.map((record) => {
    const fields = record.fields;

    const serviceValue = getField(fields, [
      "service",
      "services",
      "촬영서비스",
      "촬영 서비스",
      "서비스",
    ]);

    const regionValue = getField(fields, [
      "region",
      "regions",
      "촬영지역",
      "촬영 지역",
      "지역",
    ]);

    const priceValue = getField(fields, [
      "촬영비용",
      "price",
      "pricing",
      "예산",
      "가격",
      "금액",
    ]);

    const keywordValue = getField(fields, [
      "keywords",
      "성향키워드",
      "작가 키워드",
      "키워드",
      "keyword",
      "artist_keywords",
    ]);

    const openchatValue = getField(fields, [
      "openchat_url",
      "오픈카톡",
      "오픈카톡링크",
      "오픈카톡 링크",
      "문의하기",
      "문의링크",
    ]);

    const portfolioImagesValue = getField(fields, [
      "portfolio_images",
      "포트폴리오이미지",
      "포트폴리오 이미지",
      "portfolioImages",
    ]);

    return {
      id: record.id,
      name: toStringValue(
        getField(fields, ["업체명", "작가명", "name", "artist_name"])
      ),
      email: toStringValue(
        getField(fields, ["이메일", "email", "artist_email", "작가이메일"])
      ),
      service: Array.isArray(serviceValue)
        ? toArray(serviceValue)
        : toStringValue(serviceValue),
      region: Array.isArray(regionValue)
        ? toArray(regionValue)
        : toStringValue(regionValue),
      price: toStringValue(priceValue),
      portfolio: toStringValue(
        getField(fields, ["포트폴리오", "portfolio", "링크"])
      ),
      image: pickImage(fields),
      rating: Number(getField(fields, ["rating", "평점"]) || 4.8),
      keywords: toArray(keywordValue),
      openchat_url: toStringValue(openchatValue),
      portfolio_images: Array.isArray(portfolioImagesValue)
        ? toArray(portfolioImagesValue)
        : toStringValue(portfolioImagesValue),

      // ✅ 영상 관련 필드
      video_link_1: toStringValue(getField(fields, ["video_link_1"])),
      video_link_2: toStringValue(getField(fields, ["video_link_2"])),
      video_link_3: toStringValue(getField(fields, ["video_link_3"])),
      video_link_4: toStringValue(getField(fields, ["video_link_4"])),
      video_thumbnail: pickAttachmentUrl(getField(fields, ["video_thumbnail"])),
      artist_type: toStringValue(getField(fields, ["artist_type"])),
    };
  });
}

function matchesRegion(artist: Artist, selectedRegion: string): boolean {
  if (!selectedRegion) return true;

  const artistRegion = normalizeText(toStringValue(artist.region));
  const selected = normalizeText(selectedRegion);

  return artistRegion.includes(selected);
}

function matchesService(artist: Artist, selectedServices: string[]): boolean {
  if (selectedServices.length === 0) return true;

  const artistServices = normalizeText(toStringValue(artist.service));

  return selectedServices.some((service) =>
    artistServices.includes(normalizeText(service))
  );
}

function matchesPrice(artist: Artist, selectedPrice: string): boolean {
  if (!selectedPrice) return true;

  const artistPrice = normalizeText(toStringValue(artist.price));
  const selected = normalizeText(selectedPrice);

  return artistPrice === selected;
}

function isClosedOnDate(
  closedRecords: AirtableRecord[],
  artistEmail: string,
  selectedDate: string
): boolean {
  if (!selectedDate) return false;
  if (!artistEmail) return false;

  const normalizedArtistEmail = normalizeText(artistEmail);
  const normalizedSelectedDate = formatDateToYMD(selectedDate);
  const targetDateKey = makeDateKey(normalizedArtistEmail, normalizedSelectedDate);

  return closedRecords.some((record) => {
    const fields = record.fields;

    const closedDate = formatDateToYMD(
      toStringValue(
        getField(fields, ["날짜", "date", "촬영날짜", "닫힘날짜", "closed_date"])
      )
    );

    const closedArtistEmail = normalizeText(
      toStringValue(
        getField(fields, ["작가이메일", "artist_email", "email", "이메일"])
      )
    );

    const closedDateKey = normalizeText(
      toStringValue(getField(fields, ["date_key", "closed_key", "dateKey"]))
    );

    if (closedDateKey && targetDateKey && closedDateKey === targetDateKey) {
      return true;
    }

    return (
      closedDate === normalizedSelectedDate &&
      closedArtistEmail === normalizedArtistEmail
    );
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const date = formatDateToYMD(searchParams.get("date") || "");
    const region = searchParams.get("region") || "";
    const price = searchParams.get("price") || "";
    const services = searchParams.getAll("service");

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        {
          ok: false,
          message: "Airtable 환경변수가 설정되지 않았어.",
        },
        { status: 500 }
      );
    }

    const artistRecords = await fetchAirtableRecords(ARTISTS_TABLE);

    let closedRecords: AirtableRecord[] = [];
    try {
      closedRecords = await fetchAirtableRecords(CLOSED_DATES_TABLE);
    } catch (error) {
      console.warn("closed_dates 테이블 조회 실패:", error);
    }

    const allArtists = buildArtists(artistRecords);

   const filteredArtists = allArtists.filter((artist) => {
  const matchRegion = matchesRegion(artist, region);
  const matchService = matchesService(artist, services);
  const matchPrice = matchesPrice(artist, price);
  const matchClosed = !isClosedOnDate(closedRecords, artist.email, date);

  return matchRegion && matchService && matchPrice && matchClosed;
});

const shuffledArtists = [...filteredArtists].sort(() => Math.random() - 0.5);

    return NextResponse.json({
  ok: true,
  artists: shuffledArtists,
  total: shuffledArtists.length,
});
  } catch (error) {
    console.error("Search API error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "검색 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}