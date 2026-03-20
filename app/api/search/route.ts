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
};

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";
const CLOSED_DATES_TABLE =
  process.env.AIRTABLE_CLOSED_DATES_TABLE || "closed_dates";

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
  return value.replace(/\s/g, "").trim();
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
      "키워드",
      "keyword",
    ]);

    return {
      id: record.id,
      name: toStringValue(
        getField(fields, ["업체명", "작가명", "name", "artist_name"])
      ),
      email: toStringValue(
        getField(fields, ["이메일", "email", "artist_email"])
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
      image: toStringValue(
        getField(fields, ["대표사진", "대표이미지", "대표 이미지", "image", "thumbnail"])
      ),
      rating: Number(getField(fields, ["rating", "평점"]) || 4.8),
      keywords: toArray(keywordValue),
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
  artistName: string,
  selectedDate: string
): boolean {
  if (!selectedDate) return false;
  if (!artistName) return false;

  const normalizedArtistName = normalizeText(artistName);

  return closedRecords.some((record) => {
    const fields = record.fields;

    const closedDate = toStringValue(
      getField(fields, ["date", "촬영날짜", "닫힘날짜", "closed_date"])
    );

    const closedArtistName = normalizeText(
      toStringValue(
        getField(fields, ["artist_name", "작가명", "업체명", "name"])
      )
    );

    return closedDate === selectedDate && closedArtistName === normalizedArtistName;
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date") || "";
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
      const matchClosed = !isClosedOnDate(closedRecords, artist.name, date);

      return matchRegion && matchService && matchPrice && matchClosed;
    });

    return NextResponse.json({
      ok: true,
      artists: filteredArtists,
      total: filteredArtists.length,
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