import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "email 파라미터가 필요해요." },
        { status: 400 }
      );
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "환경변수가 설정되지 않았어요." },
        { status: 500 }
      );
    }

    // artists 테이블의 실제 ID
    const ARTISTS_TABLE_ID = "tbl8u1fnfNfTzMhyI";

    const formula = `{이메일}="${email.replace(/"/g, '\\"')}"`;

    const airtableUrl = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${ARTISTS_TABLE_ID}`
    );
    airtableUrl.searchParams.set("filterByFormula", formula);
    airtableUrl.searchParams.set("maxRecords", "1");

    const response = await fetch(airtableUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Airtable by-email lookup failed:", result);
      return NextResponse.json(
        {
          error: "작가 이메일 조회에 실패했어요.",
          detail: result,
        },
        { status: response.status }
      );
    }

    const record = result.records?.[0];

    if (!record) {
      return NextResponse.json(
        { error: "해당 이메일의 작가를 찾지 못했어요." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      artist: {
        id: record.id,
        email: record.fields?.이메일 ?? "",
        name: record.fields?.업체명 ?? "",
      },
    });
  } catch (error) {
    console.error("Artist by-email error:", error);

    return NextResponse.json(
      { error: "작가 이메일 조회 중 오류가 발생했어요." },
      { status: 500 }
    );
  }
}