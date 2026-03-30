import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const imageUrls = body?.imageUrls;

    if (!id) {
      return NextResponse.json(
        { error: "작가 레코드 ID가 없어." },
        { status: 400 }
      );
    }

    if (!Array.isArray(imageUrls)) {
      return NextResponse.json(
        { error: "imageUrls는 배열이어야 해." },
        { status: 400 }
      );
    }

    const cleanedUrls = imageUrls
      .filter((url) => typeof url === "string")
      .map((url) => url.trim())
      .filter(Boolean);

    if (cleanedUrls.length === 0) {
      return NextResponse.json(
        { error: "저장할 이미지 URL이 없어." },
        { status: 400 }
      );
    }

    if (cleanedUrls.length > 40) {
      return NextResponse.json(
        { error: "포트폴리오 이미지는 최대 40장까지만 저장할 수 있어." },
        { status: 400 }
      );
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const ARTISTS_TABLE_ID = "tbl8u1fnfNfTzMhyI";

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable 환경변수가 설정되지 않았어." },
        { status: 500 }
      );
    }

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${ARTISTS_TABLE_ID}/${id}`;

    const longTextValue = cleanedUrls.join("\n");

    const airtableResponse = await fetch(airtableUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          portfolio_images: longTextValue,
        },
      }),
    });

    const result = await airtableResponse.json();

    if (!airtableResponse.ok) {
      console.error("Airtable portfolio_images update failed:", result);

      return NextResponse.json(
        {
          error: "Airtable portfolio_images 업데이트에 실패했어.",
          detail: result,
        },
        { status: airtableResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      record: result,
      savedCount: cleanedUrls.length,
      imageUrls: cleanedUrls,
    });
  } catch (error) {
    console.error("Portfolio images update error:", error);

    return NextResponse.json(
      { error: "포트폴리오 이미지 저장 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}