import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthSession } from "@/lib/auth-helpers";
import { findArtistRow } from "@/lib/artist-lookup";
import { serverError } from "@/lib/error-response";
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimiters,
} from "@/lib/rate-limit";

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

    // 작가 1명당 분당 20회 제한 (Cloudinary 쿼터 보호)
    const rl = await checkRateLimit(
      rateLimiters.cloudinarySign,
      `artist:${artist.id}`,
    );
    if (!rl.ok) return rateLimitedResponse(rl);

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

    // 작가 PK 기반 random suffix 로 public_id 서버에서 생성.
    // 서명에 포함시켜 클라이언트가 경로를 조작하거나 타작가 파일 덮어쓰기 불가.
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const publicId = `${artist.id}_${timestamp}_${randomSuffix}`;

    // Cloudinary 서명: 알파벳 순 정렬된 `key=value&...` + apiSecret
    const paramsToSign = [
      `folder=${folder}`,
      `public_id=${publicId}`,
      `timestamp=${timestamp}`,
    ]
      .sort()
      .join("&");
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + apiSecret)
      .digest("hex");

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      publicId,
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
