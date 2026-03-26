import { NextRequest, NextResponse } from "next/server";

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
        { error: "작가 레코드 ID가 없어." },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "이미지 URL이 올바르지 않아." },
        { status: 400 }
      );
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable 환경변수가 설정되지 않았어." },
        { status: 500 }
      );
    }

    const encodedTableName = encodeURIComponent(ARTISTS_TABLE);

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodedTableName}/${id}`;

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
              url: imageUrl,
            },
          ],
        },
      }),
    });

    const result = await airtableResponse.json();

    if (!airtableResponse.ok) {
      console.error("Airtable update failed:", result);
      return NextResponse.json(
        {
          error: "Airtable 대표사진 업데이트에 실패했어.",
          detail: result,
        },
        { status: airtableResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      record: result,
      imageUrl,
    });
  } catch (error) {
    console.error("Representative image update error:", error);

    return NextResponse.json(
      { error: "대표사진 업데이트 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}