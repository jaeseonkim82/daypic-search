import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";

function sanitizeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toAttachmentValue(url: string) {
  return url ? [{ url }] : [];
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artistId } = await context.params;

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

    const videoLink1 = sanitizeString(body.video_link_1);
    const videoLink2 = sanitizeString(body.video_link_2);
    const videoLink3 = sanitizeString(body.video_link_3);
    const videoLink4 = sanitizeString(body.video_link_4);

    const videoThumb1 = sanitizeString(body.video_thumb_1);
    const videoThumb2 = sanitizeString(body.video_thumb_2);
    const videoThumb3 = sanitizeString(body.video_thumb_3);
    const videoThumb4 = sanitizeString(body.video_thumb_4);

    const videoStyleTags = sanitizeStringArray(body.video_style_tags);

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      ARTISTS_TABLE
    )}/${artistId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          video_link_1: videoLink1,
          video_link_2: videoLink2,
          video_link_3: videoLink3,
          video_link_4: videoLink4,

          video_thumb_1: toAttachmentValue(videoThumb1),
          video_thumb_2: toAttachmentValue(videoThumb2),
          video_thumb_3: toAttachmentValue(videoThumb3),
          video_thumb_4: toAttachmentValue(videoThumb4),

          video_style_tags: videoStyleTags.join(", "),
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
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "영상 포트폴리오가 저장되었어.",
      recordId: data?.id || null,
    });
  } catch (error) {
    console.error("video-portfolio PATCH error:", error);

    return NextResponse.json(
      { success: false, error: "서버 오류 발생" },
      { status: 500 }
    );
  }
}