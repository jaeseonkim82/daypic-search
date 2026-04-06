import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ARTISTS_TABLE_ID = "tbl8u1fnfNfTzMhyI";

type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
};

async function fetchArtistByRecordId(id: string) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${ARTISTS_TABLE_ID}/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data as AirtableRecord;
}

async function fetchArtistByField(fieldName: string, value: string) {
  const formula = `{${fieldName}} = "${String(value).replace(/"/g, '\\"')}"`;

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${ARTISTS_TABLE_ID}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data?.records?.[0] || null;
}

async function resolveArtistRecord(id: string) {
  let record: AirtableRecord | null = null;

  // 1) Airtable record id(recxxxx)로 조회
  record = await fetchArtistByRecordId(id);

  // 2) 실패하면 artist_id 필드값으로 조회
  if (!record) {
    record = await fetchArtistByField("artist_id", id);
  }

  // 3) 실패하면 kakao_id 필드값으로 조회
  if (!record) {
    record = await fetchArtistByField("kakao_id", id);
  }

  return record;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const imageUrl = body?.imageUrl;

    if (!id) {
      return NextResponse.json(
        { error: "작가 식별값이 없어." },
        { status: 400 }
      );
    }

    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return NextResponse.json(
        { error: "imageUrl이 필요해." },
        { status: 400 }
      );
    }

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable 환경변수가 설정되지 않았어." },
        { status: 500 }
      );
    }

    const cleanedImageUrl = imageUrl.trim();
    const artistRecord = await resolveArtistRecord(id);

    if (!artistRecord) {
      return NextResponse.json(
        { error: "대표사진을 저장할 작가 레코드를 찾지 못했어." },
        { status: 404 }
      );
    }

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${ARTISTS_TABLE_ID}/${artistRecord.id}`;

    const airtableResponse = await fetch(airtableUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          대표사진: [
            {
              url: cleanedImageUrl,
            },
          ],
        },
      }),
    });

    const result = await airtableResponse.json();

    if (!airtableResponse.ok) {
      console.error("Airtable 대표사진 update failed:", result);

      return NextResponse.json(
        {
          error: "대표사진 업데이트에 실패했어.",
          detail: result,
        },
        { status: airtableResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      record: result,
      imageUrl: cleanedImageUrl,
    });
  } catch (error) {
    console.error("Representative image update error:", error);

    return NextResponse.json(
      { error: "대표사진 저장 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}