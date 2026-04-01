import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";

export async function PATCH(req: NextRequest, context: any) {
  try {
    const artistId =
      context?.params?.id ??
      (context?.params ? (await context.params).id : undefined);

    if (!artistId) {
      return NextResponse.json(
        { success: false, error: "작가 ID가 없습니다." },
        { status: 400 }
      );
    }

    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { success: false, error: "Airtable 환경변수가 없습니다." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const {
      video_link_1,
      video_link_2,
      video_link_3,
      video_link_4,
      video_thumbnail,
      video_style_tags,
    } = body;

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      ARTISTS_TABLE
    )}/${artistId}`;

    const thumbnailValue =
      typeof video_thumbnail === "string" && video_thumbnail.trim()
        ? [{ url: video_thumbnail.trim() }]
        : [];

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          video_link_1: video_link_1 || "",
          video_link_2: video_link_2 || "",
          video_link_3: video_link_3 || "",
          video_link_4: video_link_4 || "",
          video_thumbnail: thumbnailValue,
          video_style_tags:
  typeof video_style_tags === "string"
    ? video_style_tags
    : Array.isArray(video_style_tags)
    ? video_style_tags.join(", ")
    : "",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data?.error?.message || "Airtable 저장 실패",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("video-portfolio PATCH error:", error);

    return NextResponse.json(
      { success: false, error: "서버 오류 발생" },
      { status: 500 }
    );
  }
}