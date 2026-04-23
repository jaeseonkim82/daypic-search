"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/queries/me";

export default function Header() {
  const { data: me, isLoading: loading } = useMe();
  const pathname = usePathname();

  const displayName = me?.name || me?.email || "사용자";

  const baseButtonClass =
    "inline-flex h-10 items-center justify-center rounded-full border border-[#ddd3ef] bg-white px-4 text-[12px] font-semibold text-[#5f5873] transition md:text-sm hover:bg-[#2f2552] hover:text-white hover:border-[#2f2552]";

  const activeButtonClass =
    "inline-flex h-10 items-center justify-center rounded-full border border-[#2f2552] bg-[#2f2552] px-4 text-[12px] font-semibold text-white transition md:text-sm";

  return (
    <header className="sticky top-0 z-[9999] w-full border-b border-[#ece4f5] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-[76px] max-w-[1540px] items-center justify-between px-5 py-3 md:px-8">
        {/* 왼쪽 */}
        <div className="flex items-center">
          <Link
            href="/"
            className="inline-flex items-center transition hover:opacity-90"
            aria-label="DayPic 홈으로 이동"
          >
            <img
              src="/daypic_logo.png"
              alt="DayPic 로고"
              className="h-11 w-auto object-contain md:h-12"
              draggable={false}
            />
          </Link>
        </div>

        {/* 오른쪽 */}
        <div className="flex items-center gap-2 md:gap-3">
          {loading ? (
            <div className="inline-flex h-10 items-center justify-center rounded-full border border-[#ece7f8] bg-white px-4 text-[12px] font-semibold text-[#8c86a3] md:text-sm">
              확인중...
            </div>
          ) : me?.isLoggedIn ? (
            <>
              <div className="hidden h-10 items-center justify-center rounded-full border border-[#ddd3ef] bg-white px-4 text-sm font-semibold text-[#5f5873] md:inline-flex">
                {displayName} · {me.isArtist ? "작가 계정" : "일반 계정"}
              </div>

              <Link
                href="/mypage"
                className={pathname === "/mypage" ? activeButtonClass : baseButtonClass}
              >
                Mypage
              </Link>

              {me.isArtist ? (
                <Link
                  href="/artist-dashboard"
                  className={
                    pathname === "/artist-dashboard"
                      ? activeButtonClass
                      : baseButtonClass
                  }
                >
                  정보등록
                </Link>
              ) : (
                <Link
                  href="/artist-register"
                  className={
                    pathname === "/artist-register"
                      ? activeButtonClass
                      : baseButtonClass
                  }
                >
                  작가등록
                </Link>
              )}

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className={baseButtonClass}
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/api/auth/signin" className={baseButtonClass}>
              회원가입 / 로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}