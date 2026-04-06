"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessage =
    error === "AccessDenied"
      ? "로그인 권한이 없거나, 이메일 정보를 불러오지 못했어요."
      : error
      ? "로그인 중 문제가 발생했어요. 다시 시도해주세요."
      : "";

  return (
    <main className="min-h-screen bg-[#faf7fc] px-5 py-16 text-[#251f3c] md:px-8">
      <div className="mx-auto max-w-[560px]">
        
        <section className="rounded-[32px] border border-[#e9def7] bg-white p-7 shadow-[0_18px_40px_rgba(95,71,147,0.08)] md:p-9">
          <div className="inline-flex rounded-full border border-[#eadff8] bg-[#faf7ff] px-4 py-2 text-[12px] font-semibold text-[#7a5cf6]">
            DAYPIC LOGIN
          </div>

          <h1 className="mt-5 text-[34px] font-black leading-[1.2] tracking-[-0.05em] text-[#2c2646] md:text-[42px]">
            데이픽에
            <br />
            간편하게 로그인하세요
          </h1>

          <p className="mt-4 text-[15px] leading-7 text-[#6f6888]">
            지금은 카카오 로그인으로 먼저 시작합니다.
            로그인 후 작가 등록 여부에 따라 일반 사용자 또는 작가 계정으로 연결돼요.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-[18px] border border-[#ffd7df] bg-[#fff4f6] px-4 py-4 text-[14px] font-medium text-[#b25463]">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => signIn("kakao", { callbackUrl: "/" })}
            className="mt-7 inline-flex h-[56px] w-full items-center justify-center rounded-[18px] bg-[#FEE500] px-5 text-[15px] font-bold text-[#191919] transition hover:brightness-95"
          >
            카카오로 시작하기
          </button>

          <div className="mt-5 rounded-[20px] border border-[#eee6f8] bg-[#faf8fe] px-4 py-4 text-[14px] leading-6 text-[#726a8e]">
            이메일 로그인은 다음 단계에서 추가할 예정이에요.
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-[48px] min-w-[140px] items-center justify-center rounded-full border border-[#ddd3ef] bg-white px-5 text-[14px] font-semibold text-[#5f5873] transition hover:bg-[#2f2552] hover:text-white hover:border-[#2f2552]"
            >
              홈으로 돌아가기
            </Link>

            <Link
              href="/search"
              className="inline-flex h-[48px] min-w-[140px] items-center justify-center rounded-full border border-[#ddd3ef] bg-white px-5 text-[14px] font-semibold text-[#5f5873] transition hover:bg-[#2f2552] hover:text-white hover:border-[#2f2552]"
            >
              작가 찾기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}