import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
};

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const CLOSED_DATES_TABLE =
  process.env.AIRTABLE_CLOSED_DATES_TABLE || "closed_dates";

function formatDateToYMD(value: string): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.trim();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function makeDateKey(artistId: string, date: string): string {
  const safeDate = formatDateToYMD(date);
  return `${artistId}_${safeDate}`;
}

function getHeaders() {
  if (!AIRTABLE_TOKEN) {
    throw new Error("AIRTABLE_TOKEN이 설정되지 않았어.");
  }

  return {
    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function getTableUrl() {
  if (!AIRTABLE_BASE_ID) {
    throw new Error("AIRTABLE_BASE_ID가 설정되지 않았어.");
  }

  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    CLOSED_DATES_TABLE
  )}`;
}

async function getSessionInfo(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const userId = typeof token?.userId === "string" ? token.userId : "";
  const artistId = typeof token?.artistId === "string" ? token.artistId : "";
  const email = typeof token?.email === "string" ? token.email : "";

  return { token, userId, artistId, email };
}

async function fetchClosedDatesByArtistId(
  artistId: string
): Promise<AirtableRecord[]> {
  const tableUrl = getTableUrl();

  const formula = `{artist_id}="${artistId}"`;
  let offset = "";
  const results: AirtableRecord[] = [];

  while (true) {
    const url = new URL(tableUrl);
    url.searchParams.set("filterByFormula", formula);
    url.searchParams.set("sort[0][field]", "날짜");
    url.searchParams.set("sort[0][direction]", "asc");

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Airtable 조회 실패: ${response.status} ${text}`);
    }

    const data = await response.json();
    results.push(...(data.records || []));

    if (!data.offset) break;
    offset = data.offset;
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { userId, artistId } = await getSessionInfo(request);

    if (!userId || !artistId) {
      return NextResponse.json(
        { ok: false, message: "로그인된 작가 정보가 필요해." },
        { status: 401 }
      );
    }

    const records = await fetchClosedDatesByArtistId(artistId);

    const dates = records
      .map((record) => formatDateToYMD(String(record.fields["날짜"] || "")))
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      dates,
      records: records.map((record) => ({
        id: record.id,
        date: formatDateToYMD(String(record.fields["날짜"] || "")),
        artist_id: String(record.fields["artist_id"] || ""),
        owner_user_id: String(record.fields["owner_user_id"] || ""),
        date_key: String(record.fields["date_key"] || ""),
      })),
    });
  } catch (error) {
    console.error("GET /api/artist-closed error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "촬영 불가 날짜 조회 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, artistId, email } = await getSessionInfo(request);

    if (!userId || !artistId) {
      return NextResponse.json(
        { ok: false, message: "로그인된 작가 정보가 필요해." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const date = formatDateToYMD(String(body.date || ""));

    if (!date) {
      return NextResponse.json(
        { ok: false, message: "date가 필요해." },
        { status: 400 }
      );
    }

    const dateKey = makeDateKey(artistId, date);

    const formula = encodeURIComponent(
  `AND({artist_id}="${artistId}", {날짜}="${date}")`
);

const url = `${getTableUrl()}?filterByFormula=${formula}&maxRecords=1`;

const res = await fetch(url, {
  method: "GET",
  headers: getHeaders(),
});

const existingData = await res.json();
const alreadyExists = existingData.records?.length > 0;
   
    if (alreadyExists) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        message: "이미 등록된 촬영 불가 날짜야.",
        date,
      });
    }

    const response = await fetch(getTableUrl(), {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          날짜: date,
          artist_id: artistId,
          owner_user_id: userId,
          ...(email ? { 작가이메일: email } : {}),
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Airtable 등록 실패: ${response.status} ${text}`);
    }

    const data = await response.json();

    return NextResponse.json({
      ok: true,
      duplicated: false,
      message: "촬영 불가 날짜가 등록되었어.",
      record: {
        id: data.id,
        date,
        artist_id: artistId,
        owner_user_id: userId,
      },
    });
  } catch (error) {
    console.error("POST /api/artist-closed error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "촬영 불가 날짜 등록 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, artistId } = await getSessionInfo(request);

    if (!userId || !artistId) {
      return NextResponse.json(
        { ok: false, message: "로그인된 작가 정보가 필요해." },
        { status: 401 }
      );
    }

    const date = formatDateToYMD(request.nextUrl.searchParams.get("date") || "");

    if (!date) {
      return NextResponse.json(
        { ok: false, message: "date가 필요해." },
        { status: 400 }
      );
    }

    const existing = await fetchClosedDatesByArtistId(artistId);
const matched = existing.find((record) => {
  const recordDate = formatDateToYMD(String(record.fields["날짜"] || ""));
  const recordArtistId = String(record.fields["artist_id"] || "");
  const recordOwnerUserId = String(record.fields["owner_user_id"] || "");

  return (
    recordDate === date &&
    recordArtistId === artistId &&
    recordOwnerUserId === userId
  );
});

    if (!matched) {
      return NextResponse.json(
        { ok: false, message: "해제할 촬영 불가 날짜를 찾지 못했어." },
        { status: 404 }
      );
    }

    const deleteUrl = `${getTableUrl()}/${matched.id}`;
    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Airtable 삭제 실패: ${response.status} ${text}`);
    }

    return NextResponse.json({
      ok: true,
      message: "촬영 불가 날짜가 해제되었어.",
      date,
    });
  } catch (error) {
    console.error("DELETE /api/artist-closed error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "촬영 불가 날짜 해제 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}