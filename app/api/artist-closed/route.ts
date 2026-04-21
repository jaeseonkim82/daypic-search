import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthSession } from "@/lib/auth-helpers";
import { findArtistRow } from "@/lib/artist-lookup";

function formatDateToYMD(value: string): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.trim();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function makeClosedRecordId() {
  return `rec${randomBytes(12).toString("base64url").slice(0, 14)}`;
}

async function resolveArtistContext(request: NextRequest) {
  const session = await getAuthSession(request);

  if (!session.kakaoId) {
    return { session, artistRowId: "" };
  }

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
    console.error("GET /api/artist-closed error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "촬영 불가 날짜 조회 중 오류가 발생했어.",
      },
      { status: 500 }
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

    const body = await request.json();
    const date = formatDateToYMD(String(body.date || ""));

    if (!date) {
      return NextResponse.json(
        { ok: false, message: "date가 필요해." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("closed_dates")
      .select("id")
      .eq("artist_id", artistRowId)
      .eq("closed_date", date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        message: "이미 등록된 촬영 불가 날짜야.",
        date,
      });
    }

    const recordId = makeClosedRecordId();

    const { data, error } = await supabase
      .from("closed_dates")
      .insert({
        id: recordId,
        artist_id: artistRowId,
        closed_date: date,
      })
      .select("id, artist_id, closed_date")
      .single();

    if (error) {
      throw new Error(`Supabase 등록 실패: ${error.message}`);
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
    console.error("POST /api/artist-closed error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "촬영 불가 날짜 등록 중 오류가 발생했어.",
      },
      { status: 500 }
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
    console.error("DELETE /api/artist-closed error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "촬영 불가 날짜 해제 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}
