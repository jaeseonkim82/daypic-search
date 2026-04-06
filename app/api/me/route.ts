import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, any>;
};

function pickFirstString(fields: Record<string, any>, candidates: string[]) {
  for (const key of candidates) {
    const value = fields?.[key];

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return null;
}

async function findArtistByKakaoId(kakaoId: string): Promise<AirtableRecord | null> {
  const baseId = process.env.AIRTABLE_BASE_ID!;
  const table = process.env.AIRTABLE_ARTISTS_TABLE || "artists";
  const token = process.env.AIRTABLE_TOKEN!;

  const formula = encodeURIComponent(`{kakao_id}="${kakaoId}"`);
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
    table
  )}?filterByFormula=${formula}&maxRecords=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Airtable artist kakao_id 조회 실패:", text);
    return null;
  }

  const data = await res.json();
  return data.records?.[0] || null;
}

export async function GET(req: NextRequest) {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as
    | {
        userId?: string;
        artistId?: string;
        kakaoId?: string;
        email?: string;
        name?: string;
      }
    | null;

  if (!token) {
    return NextResponse.json({
      ok: true,
      token: null,
      userId: null,
      artistId: null,
      artistCode: null,
      kakaoId: null,
      email: null,
      name: null,
      isLoggedIn: false,
      isArtist: false,
    });
  }

  let artistRecord: AirtableRecord | null = null;

  if (token.kakaoId) {
    artistRecord = await findArtistByKakaoId(String(token.kakaoId));
  }

  const artistId = artistRecord?.id ? String(artistRecord.id) : null;
  const artistCode =
    artistRecord?.fields?.artist_id
      ? String(artistRecord.fields.artist_id)
      : null;

  const airtableName = artistRecord
    ? pickFirstString(artistRecord.fields, [
        "name",
        "Name",
        "artist_name",
        "artistName",
        "작가명",
        "이름",
      ])
    : null;

  const airtableEmail = artistRecord
    ? pickFirstString(artistRecord.fields, [
        "email",
        "Email",
        "artist_email",
        "artistEmail",
        "작가이메일",
        "이메일",
      ])
    : null;

  return NextResponse.json({
    ok: true,
    token,
    userId: token.userId ?? null,
    artistId,
    artistCode,
    kakaoId: token.kakaoId ?? null,
    email: airtableEmail ?? token.email ?? null,
    name: airtableName ?? token.name ?? null,
    isLoggedIn: true,
    isArtist: !!artistId,
  });
}