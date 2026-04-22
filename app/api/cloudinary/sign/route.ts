import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthSession } from "@/lib/auth-helpers";
import { findArtistRow } from "@/lib/artist-lookup";
import { serverError } from "@/lib/error-response";

const ALLOWED_FOLDERS = new Set([
  "daypic/artists/representative",
  "daypic/artists/portfolio",
  "daypic/artists/video-thumbnails",
]);

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session.kakaoId) {
      return NextResponse.json(
        { error: "로그인이 필요해." },
        { status: 401 }
      );
    }

    // 작가 본인만 업로드 서명 발급
    const artist = await findArtistRow(session.kakaoId);
    if (!artist) {
      return NextResponse.json(
        { error: "작가 등록 후 이용할 수 있어." },
        { status: 403 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary 환경변수가 설정되지 않았어." },
        { status: 500 }
      );
    }

    let requestedFolder = "daypic/artists/representative";
    try {
      const body = await request.json();
      if (typeof body?.folder === "string" && ALLOWED_FOLDERS.has(body.folder)) {
        requestedFolder = body.folder;
      }
    } catch {
      // body 없으면 기본값 사용
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = requestedFolder;

    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + apiSecret)
      .digest("hex");

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    return serverError(
      "POST /api/cloudinary/sign",
      error,
      "Cloudinary 서명 생성 중 오류가 발생했어."
    );
  }
}
