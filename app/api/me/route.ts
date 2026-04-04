import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const userId = token?.userId ?? null;
  const artistId = token?.artistId ?? null;
  const email = token?.email ?? null;
  const name = token?.name ?? null;

  return NextResponse.json({
    ok: true,
    userId,
    artistId,
    email,
    name,
    isLoggedIn: !!userId,
    isArtist: !!artistId,
  });
}