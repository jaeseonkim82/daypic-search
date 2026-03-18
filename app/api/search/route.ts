import { NextRequest, NextResponse } from "next/server";

type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
};

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";
const CLOSED_DATES_TABLE =
  process.env.AIRTABLE_CLOSED_DATES_TABLE || "closed_dates";

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
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Airtable 요청 실패 [${tableName}]: ${response.status} ${text}`);
    }

    const data = await response.json();
    allRecords.push(...(data.records || []));

    if (!data.offset) break;
    offset = data.offset;
  }

  return allRecords;
}

function normalizeToArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function normalizeDateString(value: unknown): string {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const dottedMatch = raw.match(/^(\d{4})\.\s*(\d{2})\.\s*(\d{2})\.?$/);
  if (dottedMatch) {
    return `${dottedMatch[1]}-${dottedMatch[2]}-${dottedMatch[3]}`;
  }

  return raw;
}

function getAttachmentUrl(value: unknown): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;

  const first = value[0];
  if (!first || typeof first !== "object") return undefined;

  const url = (first as { url?: unknown }).url;
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawDate =
      searchParams.get("date") ||
      searchParams.get("dateKey") ||
      "";

    const searchDate = normalizeDateString(rawDate);

    const services = searchParams
      .getAll("service")
      .map((item) => item.trim())
      .filter(Boolean);

    const region = (searchParams.get("region") || "").trim();
    const price = (searchParams.get("price") || "").trim();

    const artistRecords = await fetchAirtableRecords(ARTISTS_TABLE);
    const closedDateRecords = await fetchAirtableRecords(CLOSED_DATES_TABLE);

    const blockedEmails = new Set(
      closedDateRecords
        .filter((record) => {
          const closedDate =
            normalizeDateString(record.fields["날짜"]) ||
            normalizeDateString(record.fields["date"]);
          return !!searchDate && closedDate === searchDate;
        })
        .map((record) =>
          String(
            record.fields["작가이메일"] ||
              record.fields["이메일"] ||
              record.fields["email"] ||
              ""
          ).trim()
        )
        .filter(Boolean)
    );

    const filteredArtists = artistRecords.filter((record) => {
      const fields = record.fields;

      const artistName = String(fields["업체명"] || "").trim();
      const artistEmail = String(fields["이메일"] || fields["email"] || "").trim();
      const artistServices = normalizeToArray(fields["촬영서비스"]);
      const artistRegions = normalizeToArray(fields["촬영지역"]);
      const artistPrice = String(fields["촬영비용"] || "").trim();
      const searchable = fields["검색노출"] === true;

      if (!artistName) return false;
      if (!artistEmail) return false;
      if (!searchable) return false;

      const serviceMatch =
        services.length === 0 ||
        services.some((selectedService) => artistServices.includes(selectedService));

      const regionMatch = !region || artistRegions.includes(region);
      const priceMatch = !price || artistPrice === price;
      const dateMatch = !searchDate || !blockedEmails.has(artistEmail);

      return serviceMatch && regionMatch && priceMatch && dateMatch;
    });

    const shuffledArtists = [...filteredArtists].sort(() => Math.random() - 0.5);

    const result = shuffledArtists.map((record, index) => ({
      id: record.id,
      name: String(record.fields["업체명"] || "").trim(),
      email: String(record.fields["이메일"] || record.fields["email"] || "").trim(),
      service: normalizeToArray(record.fields["촬영서비스"]),
      region: normalizeToArray(record.fields["촬영지역"]),
      price: String(record.fields["촬영비용"] || "").trim(),
      portfolio: String(record.fields["포트폴리오"] || "").trim(),
      image: getAttachmentUrl(record.fields["대표사진"]),
      rating: 4.8,
      keywords: normalizeToArray(record.fields["성향키워드"]).slice(0, 6),
      order: index + 1,
    }));

    return NextResponse.json({
      ok: true,
      artists: result,
      debug: {
        searchDate,
        services,
        region,
        price,
        blockedEmails: [...blockedEmails],
        artistCount: artistRecords.length,
        closedDateCount: closedDateRecords.length,
        matchedCount: result.length,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}