"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useArtistDetail } from "@/lib/queries/artist";

type VideoPortfolioItem = {
  position: number;
  link: string;
  thumb: string;
  style_tags: string[];
};

type ArtistDetail = {
  id: string;
  name: string;
  email: string;
  service: string[] | string;
  region: string[] | string;
  price: string;
  portfolio?: string;
  image?: string;
  rating?: number | null;
  style_keywords?: string[];
  open_chat_url?: string;
  portfolio_images?: string[] | string;
  artist_type?: string;
  video_portfolio_items?: VideoPortfolioItem[];
};

type SavedArtist = {
  id: string;
  name: string;
  service: string[];
  region: string[];
  price: string;
  portfolio?: string;
  image: string;
};

const RECENT_STORAGE_KEY = "daypic_recent_artists";
const FAVORITE_STORAGE_KEY = "daypic_favorite_artists";
const FALLBACK_IMAGE = "/placeholder-artist.svg";

function normalizeArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();

        if (
          item &&
          typeof item === "object" &&
          "url" in item &&
          typeof (item as { url?: unknown }).url === "string"
        ) {
          return (item as { url: string }).url.trim();
        }

        if (
          item &&
          typeof item === "object" &&
          "secure_url" in item &&
          typeof (item as { secure_url?: unknown }).secure_url === "string"
        ) {
          return (item as { secure_url: string }).secure_url.trim();
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function joinLabel(value: string[] | string | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" · ") : value;
}

function normalizeExternalUrl(url: string) {
  const value = (url || "").trim();
  if (!value) return "";
  // 명시적 http/https 만 통과. 다른 스킴(javascript:, data: 등)은 거부.
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      return "";
    }
    return "";
  }
  // 프로토콜 없는 도메인 입력은 https 로 래핑 후 재검증
  try {
    const parsed = new URL(`https://${value}`);
    if (parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function getVideoItems(artist: ArtistDetail | null): VideoPortfolioItem[] {
  if (!artist?.video_portfolio_items) return [];
  return [...artist.video_portfolio_items].sort(
    (a, b) => a.position - b.position
  );
}

function getVideoLinks(artist: ArtistDetail | null): string[] {
  return getVideoItems(artist)
    .map((item) => (item.link || "").trim())
    .filter(Boolean);
}

function isVideoArtist(artist: ArtistDetail | null) {
  if (!artist) return false;

  const serviceText = joinLabel(artist.service);
  const artistType = String(artist.artist_type || "");

  return (
    serviceText.includes("영상촬영") ||
    artistType.includes("영상") ||
    getVideoLinks(artist).length > 0
  );
}

function parseStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`${key} 저장 실패`, error);
  }
}

function buildSavedArtist(artist: ArtistDetail): SavedArtist {
  const firstThumb =
    getVideoItems(artist).find((item) => item.thumb)?.thumb || "";

  return {
    id: String(artist.id),
    name: artist.name,
    service: normalizeArray(artist.service),
    region: normalizeArray(artist.region),
    price: artist.price,
    portfolio: artist.portfolio,
    image: artist.image || firstThumb || FALLBACK_IMAGE,
  };
}

export default function ArtistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = String(params?.id || "");

  const {
    data: rawArtist,
    isLoading: loading,
    isError,
  } = useArtistDetail(artistId || null);

  const artist = useMemo<ArtistDetail | null>(() => {
    if (!rawArtist) return null;
    return {
      ...rawArtist,
      id: String(rawArtist.id ?? artistId),
      service: normalizeArray(rawArtist.service),
      region: normalizeArray(rawArtist.region),
      style_keywords: normalizeArray(rawArtist.style_keywords),
      portfolio_images: rawArtist.portfolio_images || "",
      video_portfolio_items: Array.isArray(rawArtist.video_portfolio_items)
        ? rawArtist.video_portfolio_items
        : [],
      open_chat_url: rawArtist.open_chat_url || "",
      portfolio:
        typeof rawArtist.portfolio === "string" ? rawArtist.portfolio : "",
    } as ArtistDetail;
  }, [rawArtist, artistId]);

  const [imageError, setImageError] = useState(false);

  const [recentArtists, setRecentArtists] = useState<SavedArtist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<SavedArtist[]>([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecentArtists(parseStorage<SavedArtist[]>(RECENT_STORAGE_KEY, []));
    setFavoriteArtists(parseStorage<SavedArtist[]>(FAVORITE_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    if (!artist || typeof window === "undefined") return;

    const saved = buildSavedArtist(artist);
    const currentRecent = parseStorage<SavedArtist[]>(RECENT_STORAGE_KEY, []);
    const nextRecent = [
      saved,
      ...currentRecent.filter((item) => item.id !== saved.id),
    ].slice(0, 10);

    setRecentArtists(nextRecent);
    writeStorage(RECENT_STORAGE_KEY, nextRecent);
  }, [artist]);

  const videoArtist = useMemo(() => isVideoArtist(artist), [artist]);
  const videoLinks = useMemo(() => getVideoLinks(artist), [artist]);

  const videoThumbs = useMemo(() => {
    const items = getVideoItems(artist);
    return items.map((item) => (item.thumb || "").trim());
  }, [artist]);

  const portfolioImages = useMemo(() => {
    if (!artist?.portfolio_images) return [];
    return normalizeArray(artist.portfolio_images);
  }, [artist]);

  const heroImage = useMemo(() => {
    if (!artist) return "";

    if (videoArtist) {
      const firstThumb =
        getVideoItems(artist).find((item) => item.thumb)?.thumb || "";
      if (firstThumb) return firstThumb;
    }

    if (artist.image) return artist.image;

    const portfolioFallback = normalizeArray(artist.portfolio_images)[0] || "";
    if (portfolioFallback) return portfolioFallback;

    return FALLBACK_IMAGE;
  }, [artist, videoArtist]);

  const isFavorite = useMemo(() => {
    if (!artist) return false;
    return favoriteArtists.some((item) => item.id === String(artist.id));
  }, [artist, favoriteArtists]);

  function toggleFavorite() {
    if (!artist || typeof window === "undefined") return;

    const saved = buildSavedArtist(artist);
    const exists = favoriteArtists.some((item) => item.id === saved.id);

    if (exists) {
      const nextFavorites = favoriteArtists.filter((item) => item.id !== saved.id);
      setFavoriteArtists(nextFavorites);
      writeStorage(FAVORITE_STORAGE_KEY, nextFavorites);
      return;
    }

    const nextFavorites = [saved, ...favoriteArtists].slice(0, 30);
    setFavoriteArtists(nextFavorites);
    writeStorage(FAVORITE_STORAGE_KEY, nextFavorites);
  }

  function removeFavorite(artistIdToRemove: string) {
    const nextFavorites = favoriteArtists.filter((item) => item.id !== artistIdToRemove);
    setFavoriteArtists(nextFavorites);
    writeStorage(FAVORITE_STORAGE_KEY, nextFavorites);
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function goPrevImage() {
    setLightboxIndex((prev) =>
      prev === 0 ? portfolioImages.length - 1 : prev - 1
    );
  }

  function goNextImage() {
    setLightboxIndex((prev) =>
      prev === portfolioImages.length - 1 ? 0 : prev + 1
    );
  }

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") goPrevImage();
      if (event.key === "ArrowRight") goNextImage();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, portfolioImages.length]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f5fb] text-[#272246]">
        로딩 중...
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f5fb] text-[#272246]">
        <p>작가 정보를 불러오지 못했어.</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded-[14px] bg-[#6d46f6] px-5 py-3 text-white"
        >
          검색페이지로 이동
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5fb] px-5 py-8 pb-24 text-[#25213d] md:px-8 md:pb-8">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-[14px] border border-[#e6ddf2] bg-white px-5 py-3 text-[14px] font-semibold text-[#5f587a]"
          >
            홈으로
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-[14px] border border-[#e6ddf2] bg-white px-5 py-3 text-[14px] font-semibold text-[#5f587a]"
          >
            뒤로가기
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:sticky lg:top-[104px] lg:block lg:self-start">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-[#e8e0f3] bg-[#f7f3fb] p-4 shadow-[0_10px_26px_rgba(80,60,120,0.05)]">
                <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#f1e9ff] px-3 py-2">
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
                    최근본작가
                  </h3>
                  <span className="text-[#6d46f6]">≡</span>
                </div>

                <div className="space-y-3">
                  {recentArtists.length > 0 ? (
                    recentArtists.map((recent) => (
                      <button
                        key={recent.id}
                        type="button"
                        onClick={() => router.push(`/artists/${String(recent.id)}`)}
                        className="flex w-full items-center gap-3 rounded-[16px] border border-[#ebe3f4] bg-white px-3 py-3 text-left"
                      >
                        <div className="h-11 w-11 overflow-hidden rounded-full bg-[#f1ebf8]">
                          <img
                            src={recent.image || FALLBACK_IMAGE}
                            alt={recent.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#393453]">
                            {recent.name}
                          </p>
                          <p className="truncate text-[11px] text-[#7b7396]">
                            {joinLabel(recent.region)}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[#ddd1ee] bg-white px-4 py-5 text-[12px] text-[#847b9d]">
                      아직 최근 본 작가가 없어.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e8e0f3] bg-[#f7f3fb] p-4 shadow-[0_10px_26px_rgba(80,60,120,0.05)]">
                <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#f1e9ff] px-3 py-2">
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
                    찜한 작가
                  </h3>
                  <span className="text-[#ff5c9a]">❤</span>
                </div>

                <div className="space-y-3">
                  {favoriteArtists.length > 0 ? (
                    favoriteArtists.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="flex items-center gap-3 rounded-[16px] border border-[#ebe3f4] bg-white px-3 py-3"
                      >
                        <button
                          type="button"
                          onClick={() => router.push(`/artists/${String(favorite.id)}`)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="h-11 w-11 overflow-hidden rounded-full bg-[#f1ebf8]">
                            <img
                              src={favorite.image || FALLBACK_IMAGE}
                              alt={favorite.name}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[#393453]">
                              {favorite.name}
                            </p>
                            <p className="truncate text-[11px] text-[#7b7396]">
                              {joinLabel(favorite.service)}
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFavorite(favorite.id)}
                          className="text-[#ff5c9a]"
                          aria-label="찜 해제"
                        >
                          ❤
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[#ddd1ee] bg-white px-4 py-5 text-[12px] text-[#847b9d]">
                      아직 찜한 작가가 없어.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div>
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
                      setImageError(true);
                      img.src = FALLBACK_IMAGE;
                    }}
                  />

                  <button
                    type="button"
                    onClick={toggleFavorite}
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
                    <button
                      type="button"
                      onClick={() => router.push("/search")}
                      className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#f3effb] text-[14px] font-semibold text-[#5b47c8]"
                    >
                      다른 작가 더 보기
                    </button>

                    {videoArtist ? (
                      videoLinks.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              normalizeExternalUrl(videoLinks[0]),
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#6d46f6] text-[14px] font-semibold text-white"
                        >
                          영상 포트폴리오 보기
                        </button>
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

            <section className="mt-6 rounded-[32px] border border-[#ece4f4] bg-white p-5 shadow-[0_16px_40px_rgba(80,60,120,0.06)] md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-[28px] font-black tracking-[-0.04em] text-[#272246]">
                    포트폴리오
                  </h2>
                  <p className="mt-1 text-[13px] text-[#7d7396]">
                    작가의 분위기와 촬영 스타일을 확인해보세요
                  </p>
                </div>
                <div className="rounded-full bg-[#f3ecff] px-4 py-2 text-[12px] font-semibold text-[#6d46f6]">
                  총 {portfolioImages.length}장
                </div>
              </div>

              {portfolioImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {portfolioImages.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => openLightbox(index)}
                      className="group overflow-hidden rounded-[20px] border border-[#ebe4f4] bg-[#faf7ff]"
                    >
                      <img
                        src={imageUrl}
                        alt={`${artist.name} 포트폴리오 ${index + 1}`}
                        className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.04] md:h-56"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#ddd2ef] bg-[#faf7ff] px-6 py-14 text-center text-[14px] text-[#837b9c]">
                  아직 등록된 포트폴리오 사진이 없어요.
                </div>
              )}
            </section>

            {videoArtist && (
              <section className="mt-6 rounded-[32px] border border-[#ece4f4] bg-white p-5 shadow-[0_16px_40px_rgba(80,60,120,0.06)] md:p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-[28px] font-black tracking-[-0.04em] text-[#272246]">
                      영상 포트폴리오
                    </h2>
                    <p className="mt-1 text-[13px] text-[#7d7396]">
                      실제 촬영 영상을 확인해보세요
                    </p>
                  </div>

                  <div className="rounded-full bg-[#f3ecff] px-4 py-2 text-[12px] font-semibold text-[#6d46f6]">
                    총 {videoLinks.length}개
                  </div>
                </div>

                {videoLinks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {videoLinks.map((videoUrl, index) => (
                      <div
                        key={`${videoUrl}-${index}`}
                        className="group relative overflow-hidden rounded-[22px] border border-[#ebe4f4] bg-white transition-all duration-200 hover:shadow-lg"
                      >
                        <div className="relative aspect-[16/10] bg-[#f5f3fb]">
                          {videoThumbs[index] ? (
                            <img
                              src={videoThumbs[index]}
                              alt={`샘플 영상 ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[32px]">
                              🎬
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />

                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                normalizeExternalUrl(videoUrl),
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[20px] shadow-lg">
                              ▶
                            </div>
                          </button>
                        </div>

                        <div className="p-4">
                          <p className="text-[16px] font-bold text-[#2f2a49]">
                            샘플 영상 {index + 1}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                normalizeExternalUrl(videoUrl),
                                "_blank",
                                "noopener,noreferrer"
                              )
                            }
                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[12px] bg-[#6d46f6] text-[14px] font-semibold text-white"
                          >
                            영상 보기
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[#ddd2ef] bg-[#faf7ff] px-6 py-14 text-center text-[14px] text-[#837b9c]">
                    아직 등록된 영상 포트폴리오가 없어요.
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      {artist.open_chat_url && artist.open_chat_url.trim() !== "" && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e9dff7] bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(60,50,100,0.10)] backdrop-blur md:hidden">
          <a
            href={normalizeExternalUrl(artist.open_chat_url)}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#6d46f6] text-[15px] font-bold text-white"
          >
            카카오톡으로 문의하기
          </a>
        </div>
      )}

      {lightboxOpen && portfolioImages.length > 0 ? (
        <div className="fixed inset-0 z-[100] bg-black/88 backdrop-blur-sm">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-[120] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[24px] text-white transition hover:bg-white/20"
            aria-label="닫기"
          >
            ✕
          </button>

          <div
            className="flex h-full w-full items-center justify-center px-4 py-14"
            onClick={closeLightbox}
          >
            <div
              className="relative w-full max-w-[1200px] overflow-hidden rounded-[20px]"
              onClick={(e) => e.stopPropagation()}
            >
              {portfolioImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevImage}
                    className="absolute left-3 top-1/2 z-[150] flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-[38px] font-light text-white shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition hover:scale-110 hover:bg-black/75 md:left-4 md:h-20 md:w-20 md:text-[44px]"
                    aria-label="이전 이미지"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={goNextImage}
                    className="absolute right-3 top-1/2 z-[150] flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-[38px] font-light text-white shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition hover:scale-110 hover:bg-black/75 md:right-4 md:h-20 md:w-20 md:text-[44px]"
                    aria-label="다음 이미지"
                  >
                    ›
                  </button>
                </>
              )}

              <div
                className="flex transition-transform duration-500 ease-out"
                style={{
                  width: `${portfolioImages.length * 100}%`,
                  transform: `translateX(-${lightboxIndex * (100 / portfolioImages.length)}%)`,
                }}
              >
                {portfolioImages.map((imageUrl, index) => (
                  <div
                    key={`${imageUrl}-${index}`}
                    className="flex w-full shrink-0 items-center justify-center"
                    style={{ width: `${100 / portfolioImages.length}%` }}
                  >
                    <img
                      src={imageUrl}
                      alt={`${artist.name} 포트폴리오 확대 ${index + 1}`}
                      className="max-h-[82vh] w-auto max-w-full rounded-[20px] object-contain shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white">
            {lightboxIndex + 1} / {portfolioImages.length}
          </div>
        </div>
      ) : null}
    </main>
  );
}