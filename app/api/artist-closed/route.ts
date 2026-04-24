import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthSession } from "@/lib/auth-helpers";
import { findArtistRow } from "@/lib/artist-lookup";
import { formatDateToYMD } from "@/lib/date-utils";
import { serverError } from "@/lib/error-response";
import { makeRecordId } from "@/lib/ids";
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimiters,
} from "@/lib/rate-limit";

async function resolveArtistContext(request: NextRequest) {
  const session = await getAuthSession(request);

  if (!session.kakaoId) {
    return { session, artistRowId: "" };
  }

  // 토큰의 artistId는 JWT 만료 전까지 stale 가능(작가 삭제/id 변경 등).
  // FK 위반 방지 차원에서 항상 현재 artists 테이블에서 확인한다.
  const artist = await findArtistRow(session.kakaoId);
  return {
    session,
    artistRowId: artist?.id ?? "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const { artistRowId } = await resolveArtistContext(request);

    if (!artistRowId) {
      return NextResponse.json(
        { ok: false, message: "로그인된 작가 정보가 필요해." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("closed_dates")
      .select("id, artist_id, closed_date")
      .eq("artist_id", artistRowId)
      .order("closed_date", { ascending: true });

    if (error) {
      throw new Error(`Supabase 조회 실패: ${error.message}`);
    }

    const rows = data ?? [];

    return NextResponse.json({
      ok: true,
      dates: rows.map((r) => r.closed_date).filter(Boolean),
      records: rows.map((r) => ({
        id: r.id,
        date: r.closed_date,
        artist_id: r.artist_id,
      })),
    });
  } catch (error) {
    return serverError(
      "GET /api/artist-closed",
      error,
      "촬영 불가 날짜 조회 중 오류가 발생했어."
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { artistRowId } = await resolveArtistContext(request);

    if (!artistRowId) {
      return NextResponse.json(
        { ok: false, message: "로그인된 작가 정보가 필요해." },
        { status: 401 }
      );
    }

    const rl = await checkRateLimit(
      rateLimiters.mutation,
      `artist:${artistRowId}`,
    );
    if (!rl.ok) return rateLimitedResponse(rl);

    const body = await request.json();
    const date = formatDateToYMD(String(body.date || ""));

    if (!date) {
      return NextResponse.json(
        { ok: false, message: "date가 필요해." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // closed_dates_artist_date_uniq (artist_id, closed_date) UNIQUE 활용.
    // 기존: SELECT → INSERT 2회 (race 가능). 신규: INSERT ON CONFLICT 1회 + RPC 없이 upsert.
    const recordId = makeRecordId();
    const { data, error } = await supabase
      .from("closed_dates")
      .upsert(
        {
          id: recordId,
          artist_id: artistRowId,
          closed_date: date,
        },
        { onConflict: "artist_id,closed_date", ignoreDuplicates: true },
      )
      .select("id, artist_id, closed_date")
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase 등록 실패: ${error.message}`);
    }

    // ignoreDuplicates=true 이므로 충돌 시 data=null. 이미 존재로 간주.
    const duplicated = !data;
    if (duplicated) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        message: "이미 등록된 촬영 불가 날짜야.",
        date,
      });
    }

    return NextResponse.json({
      ok: true,
      duplicated: false,
      message: "촬영 불가 날짜가 등록되었어.",
      record: {
        id: data.id,
        date: data.closed_date,
        artist_id: data.artist_id,
      },
    });
  } catch (error) {
    return serverError(
      "POST /api/artist-closed",
      error,
      "촬영 불가 날짜 등록 중 오류가 발생했어."
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { artistRowId } = await resolveArtistContext(request);

    if (!artistRowId) {
      return NextResponse.json(
        { ok: false, message: "로그인된 작가 정보가 필요해." },
        { status: 401 }
      );
    }

    const rl = await checkRateLimit(
      rateLimiters.mutation,
      `artist:${artistRowId}`,
    );
    if (!rl.ok) return rateLimitedResponse(rl);

    const date = formatDateToYMD(
      request.nextUrl.searchParams.get("date") || ""
    );

    if (!date) {
      return NextResponse.json(
        { ok: false, message: "date가 필요해." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: deleted, error } = await supabase
      .from("closed_dates")
      .delete()
      .eq("artist_id", artistRowId)
      .eq("closed_date", date)
      .select("id");

    if (error) {
      throw new Error(`Supabase 삭제 실패: ${error.message}`);
    }

    // 이미 삭제된 경우도 idempotent 성공으로 처리 (다른 기기/탭 race)
    const alreadyDeleted = !deleted || deleted.length === 0;

    return NextResponse.json({
      ok: true,
      message: alreadyDeleted
        ? "촬영 불가 날짜가 이미 해제되어 있었어."
        : "촬영 불가 날짜가 해제되었어.",
      date,
      already_deleted: alreadyDeleted,
    });
  } catch (error) {
    return serverError(
      "DELETE /api/artist-closed",
      error,
      "촬영 불가 날짜 해제 중 오류가 발생했어."
    );
  }
}
