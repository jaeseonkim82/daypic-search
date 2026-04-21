import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { findArtistRow } from "@/lib/artist-lookup";
import type { ArtistRow } from "@/lib/supabase";

export type AuthSession = {
  userId: string;
  artistId: string;
  kakaoId: string;
  email: string;
  name: string;
};

type RawToken = {
  userId?: unknown;
  artistId?: unknown;
  kakaoId?: unknown;
  email?: unknown;
  name?: unknown;
};

function pickString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function getAuthSession(req: NextRequest): Promise<AuthSession> {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as RawToken | null;

  return {
    userId: pickString(token?.userId),
    artistId: pickString(token?.artistId),
    kakaoId: pickString(token?.kakaoId),
    email: pickString(token?.email),
    name: pickString(token?.name),
  };
}

type OwnerResult =
  | { ok: true; artist: ArtistRow; session: AuthSession }
  | { ok: false; response: NextResponse };

export async function requireArtistOwner(
  req: NextRequest,
  targetId: string
): Promise<OwnerResult> {
  const session = await getAuthSession(req);

  if (!session.kakaoId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "로그인이 필요해." },
        { status: 401 }
      ),
    };
  }

  const artist = await findArtistRow(targetId);
  if (!artist) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "작가를 찾을 수 없어." },
        { status: 404 }
      ),
    };
  }

  const ownerKakao = (artist.kakao_id ?? "").toString().trim();
  if (!ownerKakao || ownerKakao !== session.kakaoId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "본인 작가 정보만 수정할 수 있어." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, artist, session };
}
