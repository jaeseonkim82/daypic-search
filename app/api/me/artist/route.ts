import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabase";
import { serverError } from "@/lib/error-response";

type RawToken = {
  artistId?: unknown;
  dbError?: unknown;
};

function pickString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function GET(req: NextRequest) {
  try {
    const token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })) as RawToken | null;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요해." },
        { status: 401 }
      );
    }

    const artistId = pickString(token.artistId);
    if (!artistId) {
      return NextResponse.json(
        { ok: false, error: "작가 계정이 아니야." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("artists")
      .select("id, name, email, phone, price, service, region, style_keywords, updated_at")
      .eq("id", artistId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "작가 정보를 찾을 수 없어." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        dbError: token.dbError === true,
        artist: {
          id: data.id,
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          price: data.price ?? "",
          service: data.service ?? [],
          region: data.region ?? [],
          style_keywords: data.style_keywords ?? [],
          updated_at: data.updated_at ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return serverError(
      "GET /api/me/artist",
      error,
      "작가 정보를 불러오는 중 오류가 발생했어."
    );
  }
}
