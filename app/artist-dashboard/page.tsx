"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  ok: boolean;
  userId: string | null;
  artistId: string | null;
  email: string | null;
  name: string | null;
  services?: string[];
};

const ADMIN_INQUIRY_URL = "https://pf.kakao.com/_YOUR_CHANNEL_LINK";

const headerButtonClass =
  "inline-flex h-[44px] min-w-[116px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-colors duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white";

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeout = 10000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export default function ArtistDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [artistName, setArtistName] = useState("");
  const [artistId, setArtistId] = useState("");
  const [email, setEmail] = useState("");
  const [services, setServices] = useState<string[]>([]);

  useEffect(() => {
    async function loadSession() {
      try {
        setError("");

        const res = await fetchWithTimeout("/api/me", { cache: "no-store" }, 10000);
        const data: MeResponse = await res.json();

        if (!res.ok || !data.ok || !data.userId || !data.artistId) {
          window.location.href = "/api/auth/signin";
          return;
        }

        setArtistName(data.name || "작가님");
        setArtistId(data.artistId || "");
        setEmail(data.email || "");
        setServices(data.services || []);
      } catch (err) {
        window.location.href = "/api/auth/signin";
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf7fc] px-5 py-10 text-[#251f3c]">
        <div className="mx-auto max-w-[1180px] rounded-[28px] border border-[#e9e1f3] bg-white p-8 text-center shadow-[0_12px_30px_rgba(60,50,100,0.06)]">
          로그인 정보를 확인하고 있습니다.
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#faf7fc] px-5 py-10 text-[#251f3c]">
        <div className="mx-auto max-w-[1180px] rounded-[28px] border border-[#f0d6dc] bg-white p-8 text-center text-[#a33a3a] shadow-[0_12px_30px_rgba(60,50,100,0.06)]">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf7fc] text-[#251f3c]">
      <header className="sticky top-0 z-40 border-b border-[#ece4f5] bg-white/88 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center">
            <img
              src="/daypic_logo.png"
              alt="DayPic 로고"
              className="h-11 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            <Link href="/" className={headerButtonClass}>
              홈으로 돌아가기
            </Link>
            <Link href="/search" className={headerButtonClass}>
              가능한 작가 찾기
            </Link>
            <a
              href={ADMIN_INQUIRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={headerButtonClass}
            >
              관리자 문의
            </a>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/"
              className="inline-flex h-[40px] min-w-[92px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-4 text-[12px] font-semibold text-[#4d426b]"
            >
              홈
            </Link>
            <Link
              href="/search"
              className="inline-flex h-[40px] min-w-[92px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-4 text-[12px] font-semibold text-[#4d426b]"
            >
              작가 찾기
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-8 md:px-8 md:pt-10">
        <section className="overflow-hidden rounded-[38px] border border-[#ece3f6] bg-[radial-gradient(circle_at_top_left,_rgba(144,110,255,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(244,170,214,0.12),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#fcf9ff_52%,_#f8f3fb_100%)] p-6 shadow-[0_18px_40px_rgba(78,58,130,0.08)] md:p-8 xl:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
            <div>
              <div className="inline-flex rounded-full border border-[#e7dbf7] bg-white px-4 py-2 text-[12px] font-semibold text-[#7a5cf6]">
                DAYPIC ARTIST DASHBOARD
              </div>

              <h1 className="mt-5 text-[34px] font-black leading-[1.16] tracking-[-0.06em] text-[#2a2444] md:text-[52px]">
                작가님이 더 잘 보이도록,
                <br />
                데이픽이 연결의 흐름을 만들겠습니다
              </h1>

              <p className="mt-5 max-w-[760px] text-[16px] leading-8 text-[#6f6888]">
                안녕하세요,{" "}
                <span className="font-bold text-[#4f3ccf]">
                  {artistName || "작가님"}
                </span>
                님.
                <br />
                데이픽은 단순히 정보를 올리는 공간이 아니라, 촬영 가능한 날짜와
                조건을 기준으로 고객과 더 빠르게 연결될 수 있도록 설계된 작가 전용
                플랫폼입니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex rounded-full bg-[#f2ebff] px-4 py-2 text-[13px] font-semibold text-[#6d46f6]">
                  날짜 기준 매칭
                </div>
                <div className="inline-flex rounded-full bg-[#f8eef8] px-4 py-2 text-[13px] font-semibold text-[#c0569f]">
                  광고보다 연결 중심
                </div>
                <div className="inline-flex rounded-full bg-[#edf5ff] px-4 py-2 text-[13px] font-semibold text-[#4a73d6]">
                  작가 전용 관리 페이지
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-[24px] border border-[#e8dff3] bg-white/92 p-5 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f2ebff] text-[20px]">
                    👤
                  </div>
                  <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#2b2745]">
                    작가 정보 등록
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#6e6786]">
                    업체명, 지역, 서비스, 가격, 문의 링크 등 기본 정보를 등록하고
                    수정하실 수 있습니다.
                  </p>
                  <Link
                    href="/artist-register"
                    className="mt-5 inline-flex h-[48px] w-full items-center justify-center rounded-[16px] bg-[#6948f5] text-[15px] font-bold text-white transition hover:bg-[#5636df]"
                  >
                    정보 등록하러 가기
                  </Link>
                </article>

                <article className="rounded-[24px] border border-[#e8dff3] bg-white/92 p-5 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff1f7] text-[20px]">
                    🖼️
                  </div>
                  <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#2b2745]">
                    사진 갤러리
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#6e6786]">
                    이미지를 등록하고 고객에게 보여질
                    사진 갤러리를 관리하실 수 있습니다.
                  </p>
                  <Link
                    href="/artist-upload"
                    className="mt-5 inline-flex h-[48px] w-full items-center justify-center rounded-[16px] bg-[#6948f5] text-[15px] font-bold text-white transition hover:bg-[#5636df]"
                  >
                    사진 갤러리 관리
                  </Link>
                </article>

                <article className="rounded-[24px] border border-[#e8dff3] bg-white/92 p-5 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef5ff] text-[20px]">
                    🎬
                  </div>
                  <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#2b2745]">
                    영상 갤러리
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#6e6786]">
                    유튜브, 릴스, 비메오 등 영상 포트폴리오를 등록하고 고객에게
                    보여줄 수 있습니다.
                  </p>
                  <Link
                    href={email ? `/video-upload?email=${encodeURIComponent(email)}` : "#"}
                    className={`mt-5 inline-flex h-[48px] w-full items-center justify-center rounded-[16px] text-[15px] font-bold text-white transition ${
                      email
                        ? "bg-[#6948f5] hover:bg-[#5636df]"
                        : "cursor-not-allowed bg-[#b9acef]"
                    }`}
                  >
                    영상 등록하기
                  </Link>
                </article>

                <article className="rounded-[24px] border border-[#e8dff3] bg-white/92 p-5 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#edf5ff] text-[20px]">
                    📅
                  </div>
                  <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#2b2745]">
                    일정 관리
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#6e6786]">
                    촬영 불가 날짜를 등록하거나 해제하여 검색 결과에 정확하게
                    반영되도록 관리하실 수 있습니다.
                  </p>
                  <Link
                    href="/artist-calendar"
                    className="mt-5 inline-flex h-[48px] w-full items-center justify-center rounded-[16px] bg-[#6948f5] text-[15px] font-bold text-white transition hover:bg-[#5636df]"
                  >
                    일정 관리
                  </Link>
                </article>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#eadff7] bg-white/88 p-6 shadow-[0_12px_28px_rgba(84,62,133,0.07)]">
              <div className="text-[12px] font-bold tracking-[0.14em] text-[#9b8dbf]">
                DAYPIC GUIDE
              </div>

              <h2 className="mt-3 text-[28px] font-black leading-[1.25] tracking-[-0.05em] text-[#2b2745]">
                작가님의 정보를
                <br />
                더 선명하게 보여주세요
              </h2>

              <p className="mt-4 text-[15px] leading-7 text-[#6e6786]">
                등록 정보가 정리될수록 검색 연결 정확도가 올라가고, 고객이
                작가님의 강점을 더 쉽게 이해할 수 있습니다.
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-[18px] bg-[#f7f3ff] px-4 py-4">
                  <div className="text-[12px] font-bold tracking-[0.12em] text-[#8c78d6]">
                    STEP 1
                  </div>
                  <div className="mt-1 text-[16px] font-bold text-[#2d2748]">
                    작가 정보 등록
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-[#6e6786]">
                    서비스, 지역, 비용, 인스타 및 오픈채팅, 홈페이지 등 문의 가능한 링크를 먼저 정리해 주세요.
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#fcf4f8] px-4 py-4">
                  <div className="text-[12px] font-bold tracking-[0.12em] text-[#cc6aa9]">
                    STEP 2
                  </div>
                  <div className="mt-1 text-[16px] font-bold text-[#2d2748]">
                    사진 갤러리 관리
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-[#6e6786]">
                    대표 사진과 포트폴리오 이미지를 정리해 고객에게 보여주세요.
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#eef5ff] px-4 py-4">
                  <div className="text-[12px] font-bold tracking-[0.12em] text-[#5b7fda]">
                    STEP 3
                  </div>
                  <div className="mt-1 text-[16px] font-bold text-[#2d2748]">
                    영상 갤러리 관리
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-[#6e6786]">
                    영상 포트폴리오 링크를 등록해 영상 스타일을 보여주세요.
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#f3f7ff] px-4 py-4">
                  <div className="text-[12px] font-bold tracking-[0.12em] text-[#6484d8]">
                    STEP 4
                  </div>
                  <div className="mt-1 text-[16px] font-bold text-[#2d2748]">
                    일정 관리
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-[#6e6786]">
                    촬영 불가 날짜를 정확히 관리해 잘못된 문의를 줄여주세요.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[20px] bg-[#f4ecff] px-5 py-4 text-[#6846d7]">
                <div className="text-[13px] font-semibold opacity-90">
                  DAYPIC MESSAGE
                </div>
                <div className="mt-1 text-[17px] font-bold leading-7">
                  좋은 작가님이 더 공정하게 연결될 수 있도록,
                  데이픽이 그 흐름을 함께 만들겠습니다.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)]">
          <h3 className="text-[20px] font-black tracking-[-0.04em] text-[#2b2745]">
            이렇게 달라집니다
          </h3>
          <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
            작가 정보와 일정이 정리될수록, 노출과 문의 연결 속도가 달라집니다.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">노출 정확도 상승</span>
              촬영 서비스, 지역, 가격이 정리될수록 고객에게 더 정확하게 노출됩니다.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">문의 전환 증가</span>
              포트폴리오와 오픈채팅 링크가 명확할수록 실제 문의로 이어질 확률이 높아집니다.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">불필요한 문의 감소</span>
              일정 관리가 정확할수록 이미 불가능한 날짜 문의를 줄일 수 있습니다.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">빠른 연결 흐름</span>
              고객은 비교보다 빠른 선택을 원하고, 정리된 작가가 먼저 선택됩니다.
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/artist-register"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white"
            >
              작가 정보 등록하기
            </Link>
            <Link
              href="/artist-calendar"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white"
            >
              일정 관리 바로가기
            
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}