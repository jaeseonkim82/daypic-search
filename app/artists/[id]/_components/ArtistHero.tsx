"use client";

import Link from "next/link";
import { joinLabel, normalizeArray } from "@/lib/normalize";
import {
  FALLBACK_IMAGE,
  normalizeExternalUrl,
  type ArtistDetail,
} from "../_lib/utils";

type Props = {
  artist: ArtistDetail;
  heroImage: string;
  imageError: boolean;
  onImageError: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  videoArtist: boolean;
  videoLinks: string[];
};

export default function ArtistHero({
  artist,
  heroImage,
  imageError,
  onImageError,
  isFavorite,
  onToggleFavorite,
  videoArtist,
  videoLinks,
}: Props) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[#ece4f4] bg-white shadow-[0_18px_44px_rgba(80,60,120,0.08)]">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[420px] bg-[#f2ebfb]">
          <img
            src={imageError || !heroImage ? FALLBACK_IMAGE : heroImage}
            alt={artist.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.endsWith(FALLBACK_IMAGE)) return;
              onImageError();
              img.src = FALLBACK_IMAGE;
            }}
          />

          <button
            type="button"
            onClick={onToggleFavorite}
            className={`absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm ${
              isFavorite
                ? "border-[#ffbdd4] bg-[#ffedf5] text-[#ff5c9a]"
                : "border-white/70 bg-white/85 text-[#6a617f]"
            }`}
            aria-label={isFavorite ? "찜 해제" : "찜하기"}
          >
            {isFavorite ? "❤" : "♡"}
          </button>
        </div>

        <div className="p-6 md:p-8">
          <p className="inline-flex rounded-full bg-[#f3ecff] px-3 py-1 text-[12px] font-semibold text-[#7b5cf6]">
            DAYPIC ARTIST
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-[34px] font-black tracking-[-0.05em] text-[#272246]">
              {artist.name || "업체명 준비중"}
            </h1>

            {artist.open_chat_url && artist.open_chat_url.trim() !== "" && (
              <a
                href={normalizeExternalUrl(artist.open_chat_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#6d46f6] px-5 text-[14px] font-semibold text-white transition hover:opacity-90"
              >
                문의하기
              </a>
            )}
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
              <p className="text-[12px] font-semibold text-[#8f84a8]">촬영 서비스</p>
              <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                {joinLabel(artist.service)}
              </p>
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
              <p className="text-[12px] font-semibold text-[#8f84a8]">촬영 지역</p>
              <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                {joinLabel(artist.region)}
              </p>
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
              <p className="text-[12px] font-semibold text-[#8f84a8]">예산</p>
              <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                {artist.price}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[13px] font-semibold text-[#8f84a8]">작가 키워드</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {normalizeArray(artist.style_keywords).map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center rounded-full bg-[#f2ebff] px-3 py-1.5 text-[12px] font-medium text-[#6d46f6]"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/search"
              className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#f3effb] text-[14px] font-semibold text-[#5b47c8]"
            >
              다른 작가 더 보기
            </Link>

            {videoArtist ? (
              videoLinks.length > 0 ? (
                <a
                  href={normalizeExternalUrl(videoLinks[0])}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#6d46f6] text-[14px] font-semibold text-white"
                >
                  영상 포트폴리오 보기
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#ece8f6] text-[14px] font-semibold text-[#9a93b1]"
                >
                  영상 준비중
                </button>
              )
            ) : artist.portfolio && artist.portfolio.trim() !== "" ? (
              <a
                href={normalizeExternalUrl(artist.portfolio)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#6d46f6] text-[14px] font-semibold text-white"
              >
                포트폴리오 더보기
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#ece8f6] text-[14px] font-semibold text-[#9a93b1]"
              >
                포트폴리오 준비중
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
