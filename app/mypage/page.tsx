"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  isLoggedIn: boolean;
  isArtist?: boolean;
  artistId?: string;
  artistCode?: string;
  kakaoId?: string;
  email?: string;
  name?: string;
};

export default function MyPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const fetchMe = async () => {
      try {
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();

        if (!ignore) {
          setMe(data);
        }
      } catch (error) {
        console.error("마이페이지 사용자 정보 조회 실패:", error);

        if (!ignore) {
          setMe({
            isLoggedIn: false,
          });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchMe();

    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fcfbff] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-[28px] border border-[#ece7ff] bg-white p-8 shadow-sm">
            <p className="text-sm text-[#7b728f]">마이페이지 불러오는 중...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!me?.isLoggedIn) {
    return (
      <main className="min-h-screen bg-[#fcfbff] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-[28px] border border-[#ece7ff] bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold tracking-[0.08em] text-[#8a7eb0]">
              DAYPIC MY PAGE
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#2b2341]">
              로그인이 필요해
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-[#6f6888]">
              로그인 후 마이페이지에서 계정 정보와 작가 전용 메뉴를 확인할 수 있어.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#7a5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                로그인 하러 가기
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-[#ddd5ff] bg-white px-5 py-3 text-sm font-semibold text-[#5d5383] transition hover:bg-[#f7f4ff]"
              >
                홈으로 가기
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const isArtist = !!me.isArtist;
  const displayName = me.name?.trim() || "이름 정보 없음";
  const displayEmail = me.email?.trim() || "이메일 정보 없음";

  return (
    <main className="min-h-screen bg-[#fcfbff] px-6 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[30px] border border-[#ece7ff] bg-white p-8 shadow-sm md:p-10">
          <p className="text-sm font-semibold tracking-[0.08em] text-[#8a7eb0]">
            DAYPIC MY PAGE
          </p>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-[#2b2341] md:text-4xl">
                {isArtist ? "작가 마이페이지" : "내 정보"}
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-[#6f6888]">
                {isArtist
                  ? "작가 계정으로 연결되어 있어. 대시보드와 업로드, 일정관리로 바로 이동할 수 있어."
                  : "일반 사용자 계정이야. 이후 찜한 작가, 최근 본 작가, 문의 내역을 여기서 확장할 수 있어."}
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-[#e5defd] bg-[#faf8ff] px-4 py-2 text-sm font-semibold text-[#6f5bd3]">
              {isArtist ? "작가 회원" : "일반 회원"}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-[24px] border border-[#ece7ff] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#2b2341]">기본 정보</h2>

              {isArtist ? (
                <Link
                  href="/artist-profile/edit"
                  className="inline-flex items-center justify-center rounded-full border border-[#d8ceff] bg-[#faf8ff] px-4 py-2 text-sm font-semibold text-[#6f5bd3] transition hover:bg-[#f4efff]"
                >
                  작가정보 수정
                </Link>
              ) : null}
            </div>

            <div className="mt-5 space-y-3 text-sm text-[#5f5875]">
              <InfoRow label="이름" value={displayName} />
              <InfoRow label="이메일" value={displayEmail} />
              <InfoRow label="회원 유형" value={isArtist ? "작가" : "일반 사용자"} />
            </div>

            {!me.name?.trim() || !me.email?.trim() ? (
              <div className="mt-4 rounded-2xl bg-[#faf8ff] px-4 py-3 text-sm leading-6 text-[#7b728f]">
                일부 계정 정보가 아직 연결되지 않았어.
              </div>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-[#ece7ff] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#2b2341]">
              {isArtist ? "빠른 이동" : "계정 메뉴"}
            </h2>

            <div className="mt-5 grid gap-3">
              {isArtist ? (
                <>
                  <QuickLink
                    href="/artist-dashboard"
                    title="작가 대시보드"
                    desc="작가 전용 대시보드로 이동"
                  />
                  <QuickLink
                    href="/artist-upload"
                    title="포트폴리오 업로드"
                    desc="대표이미지 / 포트폴리오 이미지 관리"
                  />
                  <QuickLink
                    href="/artist-calendar"
                    title="일정 관리"
                    desc="촬영 가능 날짜 관리"
                  />
                  <QuickLink
                    href="/video-upload"
                    title="영상포트폴리오 수정"
                    desc="영상 링크 / 링크별 썸네일 / 스타일 태그 관리"
                  />
                </>
              ) : (
                <>
                  <QuickLink
                    href="/artist-register"
                    title="작가 등록하기"
                    desc="작가 계정으로 전환하려면 먼저 등록 진행"
                  />
                  <QuickLink
                    href="/artists"
                    title="작가 둘러보기"
                    desc="조건에 맞는 작가 검색하러 가기"
                  />
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-dashed border-[#ddd5ff] bg-[#faf8ff] p-6">
          <h2 className="text-lg font-bold text-[#2b2341]">다음 확장 영역</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <PlaceholderCard title="찜한 작가" desc="나중에 연결" />
            <PlaceholderCard title="최근 본 작가" desc="나중에 연결" />
            <PlaceholderCard title="문의 내역" desc="나중에 연결" />
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-[#faf8ff] px-4 py-3">
      <span className="min-w-[90px] text-[#8a7eb0]">{label}</span>
      <span className="break-all text-right font-medium text-[#2b2341]">{value}</span>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[20px] border border-[#e8e1ff] bg-[#faf8ff] p-4 transition hover:border-[#cfc2ff] hover:bg-[#f6f2ff]"
    >
      <div className="text-[15px] font-bold text-[#2b2341]">{title}</div>
      <div className="mt-1 text-sm leading-6 text-[#6f6888]">{desc}</div>
    </Link>
  );
}

function PlaceholderCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-[20px] border border-white bg-white p-4 shadow-sm">
      <div className="text-[15px] font-bold text-[#2b2341]">{title}</div>
      <div className="mt-1 text-sm text-[#6f6888]">{desc}</div>
    </div>
  );
}