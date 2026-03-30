"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  keywords?: string[];
  성향키워드?: string[] | string;
  openchat_url?: string;
  portfolio_images?: string[] | string;
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

const DETAIL_STORAGE_KEY = "daypic_artist_detail_cache";
const RECENT_STORAGE_KEY = "daypic_recent_artists";
const FAVORITE_STORAGE_KEY = "daypic_favorite_artists";

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
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseStorage<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(storage: Storage, key: string, value: T) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`${key} 저장 실패`, error);
  }
}

function joinLabel(value: string[] | string | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" · ") : value;
}

function buildSavedArtist(artist: ArtistDetail): SavedArtist {
  return {
    id: String(artist.id),
    name: artist.name,
    service: normalizeArray(artist.service),
    region: normalizeArray(artist.region),
    price: artist.price,
    portfolio: artist.portfolio,
    image: artist.image || "",
  };
}

export default function ArtistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = String(params?.id || "");

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [recentArtists, setRecentArtists] = useState<SavedArtist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<SavedArtist[]>([]);
  const [showFloatingContact, setShowFloatingContact] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<number | null>(null);

  const [recentOpen, setRecentOpen] = useState(true);
  const [favoriteOpen, setFavoriteOpen] = useState(true);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const recent = parseStorage<SavedArtist[]>(
      window.localStorage,
      RECENT_STORAGE_KEY,
      []
    );

    const favorite = parseStorage<SavedArtist[]>(
      window.localStorage,
      FAVORITE_STORAGE_KEY,
      []
    );

    const detailCache = parseStorage<Record<string, ArtistDetail>>(
      window.localStorage,
      DETAIL_STORAGE_KEY,
      {}
    );

    setRecentArtists(recent);
    setFavoriteArtists(favorite);

    const cachedArtist = detailCache[artistId];

    if (cachedArtist) {
      const normalizedKeywords =
        normalizeArray(cachedArtist.keywords).length > 0
          ? normalizeArray(cachedArtist.keywords)
          : normalizeArray(cachedArtist["성향키워드"]);

      setArtist({
        ...cachedArtist,
        id: String(cachedArtist.id ?? artistId),
        service: normalizeArray(cachedArtist.service),
        region: normalizeArray(cachedArtist.region),
        keywords: normalizedKeywords,
        성향키워드: normalizedKeywords,
        openchat_url: cachedArtist.openchat_url || "",
        portfolio_images: cachedArtist.portfolio_images || "",
      });
    }

    let isMounted = true;

    async function fetchArtistDetail() {
      try {
        const response = await fetch(
          `/api/artists/${encodeURIComponent(artistId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`작가 상세 조회 실패: ${response.status}`);
        }

        const data = await response.json();

        if (!isMounted) return;

        const normalizedKeywords =
          normalizeArray(data.keywords).length > 0
            ? normalizeArray(data.keywords)
            : normalizeArray(data["성향키워드"]);

        const normalizedArtist: ArtistDetail = {
          ...data,
          id: String(data.id ?? artistId),
          service: normalizeArray(data.service),
          region: normalizeArray(data.region),
          keywords: normalizedKeywords,
          성향키워드: normalizedKeywords,
          openchat_url: data.openchat_url || "",
          portfolio_images: data.portfolio_images || "",
        };

        setArtist(normalizedArtist);

        const nextDetailCache = {
          ...detailCache,
          [artistId]: normalizedArtist,
        };

        writeStorage(window.localStorage, DETAIL_STORAGE_KEY, nextDetailCache);
      } catch (error) {
        console.error("작가 상세 불러오기 실패", error);

        if (!cachedArtist && isMounted) {
          setArtist(null);
        }
      }
    }

    if (artistId) {
      fetchArtistDetail();
    }

    return () => {
      isMounted = false;
    };
  }, [artistId]);

  useEffect(() => {
    function handleScroll() {
      setShowFloatingContact(window.scrollY > 320);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const keywords = useMemo(() => {
    if (!artist) return [];
    const primary = normalizeArray(artist.keywords);
    if (primary.length > 0) return primary;
    return normalizeArray(artist["성향키워드"]);
  }, [artist]);

  const portfolioImages = useMemo(() => {
    if (!artist?.portfolio_images) return [];
    return normalizeArray(artist.portfolio_images);
  }, [artist]);

  const selectedPortfolioImage = useMemo(() => {
    if (
      selectedPortfolioIndex === null ||
      selectedPortfolioIndex < 0 ||
      selectedPortfolioIndex >= portfolioImages.length
    ) {
      return null;
    }

    return portfolioImages[selectedPortfolioIndex];
  }, [portfolioImages, selectedPortfolioIndex]);

  const isFavorite = useMemo(() => {
    if (!artist) return false;
    return favoriteArtists.some((item) => item.id === String(artist.id));
  }, [artist, favoriteArtists]);

  function goHome() {
    router.push("/");
  }

  function goArtistDetail(targetId: string) {
    router.push(`/artists/${String(targetId)}`);
  }

  function handleContactClick() {
    if (!artist?.openchat_url) return;
    window.open(artist.openchat_url, "_blank", "noopener,noreferrer");
  }

  function toggleFavoriteCurrentArtist() {
    if (!artist || typeof window === "undefined") return;

    const exists = favoriteArtists.some((item) => item.id === String(artist.id));

    if (exists) {
      const nextFavorites = favoriteArtists.filter(
        (item) => item.id !== String(artist.id)
      );
      setFavoriteArtists(nextFavorites);
      writeStorage(window.localStorage, FAVORITE_STORAGE_KEY, nextFavorites);
      return;
    }

    const nextFavorites = [buildSavedArtist(artist), ...favoriteArtists].slice(0, 30);
    setFavoriteArtists(nextFavorites);
    writeStorage(window.localStorage, FAVORITE_STORAGE_KEY, nextFavorites);
  }

  function removeFavorite(artistIdToRemove: string) {
    if (typeof window === "undefined") return;

    const nextFavorites = favoriteArtists.filter(
      (item) => item.id !== artistIdToRemove
    );
    setFavoriteArtists(nextFavorites);
    writeStorage(window.localStorage, FAVORITE_STORAGE_KEY, nextFavorites);
  }

  function closePortfolioModal() {
    setSelectedPortfolioIndex(null);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  }

  function goToPrevPortfolioImage() {
    if (portfolioImages.length === 0) return;

    setSelectedPortfolioIndex((prev) => {
      if (prev === null) return 0;
      return prev === 0 ? portfolioImages.length - 1 : prev - 1;
    });
  }

  function goToNextPortfolioImage() {
    if (portfolioImages.length === 0) return;

    setSelectedPortfolioIndex((prev) => {
      if (prev === null) return 0;
      return prev === portfolioImages.length - 1 ? 0 : prev + 1;
    });
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1) return;

    touchStartXRef.current = event.touches[0].clientX;
    touchStartYRef.current = event.touches[0].clientY;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;

    const diffX = endX - touchStartXRef.current;
    const diffY = endY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const horizontalThreshold = 50;
    const verticalAllowance = 80;

    if (Math.abs(diffX) < horizontalThreshold) return;
    if (Math.abs(diffY) > verticalAllowance) return;
    if (Math.abs(diffX) <= Math.abs(diffY)) return;

    if (diffX < 0) {
      goToNextPortfolioImage();
    } else {
      goToPrevPortfolioImage();
    }
  }

  useEffect(() => {
    if (selectedPortfolioIndex === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePortfolioModal();
        return;
      }

      if (event.key === "ArrowLeft") {
        goToPrevPortfolioImage();
        return;
      }

      if (event.key === "ArrowRight") {
        goToNextPortfolioImage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPortfolioIndex, portfolioImages.length]);

  useEffect(() => {
    if (selectedPortfolioIndex === null) return;
    if (!thumbnailStripRef.current) return;

    const activeThumb = thumbnailStripRef.current.querySelector(
      `[data-thumb-index="${selectedPortfolioIndex}"]`
    ) as HTMLElement | null;

    if (!activeThumb) return;

    activeThumb.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedPortfolioIndex]);

  if (!artist) {
    return (
      <main className="min-h-screen bg-[#f8f5fb] px-5 py-10 text-[#25213d] md:px-8">
        <div className="mx-auto max-w-[960px] rounded-[32px] border border-[#ece4f4] bg-white p-8 text-center">
          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#272246]">
            작가 정보를 불러오지 못했어요
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-[#6f6886]">
            검색페이지에서 다시 작가를 선택해주세요.
          </p>

          <button
            type="button"
            onClick={goHome}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[14px] bg-[#6d46f6] px-5 text-[14px] font-semibold text-white"
          >
            검색페이지로 이동
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5fb] px-5 py-6 pb-28 text-[#25213d] md:px-8 md:py-8 md:pb-32">
      <div className="mx-auto max-w-[1520px]">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center gap-3 self-start"
          >
            <img
              src="/daypic_logo.png"
              alt="daypic logo"
              className="h-11 w-auto object-contain"
            />
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#e6ddf2] bg-white px-5 text-[14px] font-semibold text-[#5f587a] shadow-sm"
          >
            ← 뒤로가기
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-[24px] border border-[#e8e1f2] bg-[#f8f5fc] p-4">
              <button
                type="button"
                onClick={() => setRecentOpen((prev) => !prev)}
                className="mb-3 flex w-full items-center justify-between rounded-[16px] bg-[#f1eaff] px-3 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[15px] text-[#6d46f6]">≡</span>
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
                    최근본작가
                  </h3>
                </div>
                <span className="text-[16px] text-[#6d46f6]">
                  {recentOpen ? "⌃" : "⌄"}
                </span>
              </button>

              {recentOpen ? (
                <div className="space-y-3">
                  {recentArtists.length > 0 ? (
                    recentArtists.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goArtistDetail(item.id)}
                        className="flex w-full items-center gap-3 rounded-[16px] border border-[#ebe4f4] bg-white px-3 py-3 text-left"
                      >
                        <div className="h-12 w-12 overflow-hidden rounded-full bg-[#f1ebf8]">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[#8b83a6]">
                              no img
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-[#393453]">
                            {item.name}
                          </p>
                          <p className="truncate text-[12px] text-[#7b7396]">
                            {joinLabel(item.region)}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[#ddd2ef] bg-white px-4 py-5 text-[12px] text-[#837b9c]">
                      아직 최근 본 작가가 없어요.
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <section className="rounded-[24px] border border-[#e8e1f2] bg-[#f8f5fc] p-4">
              <button
                type="button"
                onClick={() => setFavoriteOpen((prev) => !prev)}
                className="mb-3 flex w-full items-center justify-between rounded-[16px] bg-[#f1eaff] px-3 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[15px] text-[#ff5c9a]">❤</span>
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
                    찜한 작가
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#7c7497]">
                    {favoriteArtists.length}명
                  </span>
                  <span className="text-[16px] text-[#6d46f6]">
                    {favoriteOpen ? "⌃" : "⌄"}
                  </span>
                </div>
              </button>

              {favoriteOpen ? (
                <div className="space-y-3">
                  {favoriteArtists.length > 0 ? (
                    favoriteArtists.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-[16px] border border-[#ebe4f4] bg-white px-3 py-3"
                      >
                        <button
                          type="button"
                          onClick={() => goArtistDetail(item.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <div className="h-12 w-12 overflow-hidden rounded-full bg-[#f1ebf8]">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-[#8b83a6]">
                                no img
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-[#393453]">
                              {item.name}
                            </p>
                            <p className="truncate text-[12px] text-[#7b7396]">
                              {joinLabel(item.region)}
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFavorite(item.id)}
                          className="text-[#ff5c9a]"
                          aria-label="찜 해제"
                        >
                          ❤
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[#ddd2ef] bg-white px-4 py-5 text-[12px] text-[#837b9c]">
                      아직 찜한 작가가 없어요.
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          </aside>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[36px] border border-[#ece4f4] bg-white shadow-[0_18px_44px_rgba(80,60,120,0.08)]">
              <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="relative min-h-[420px] bg-[#f2ebfb]">
                  {!artist.image || imageError ? (
                    <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#f4edff_0%,#efe7fb_100%)] px-6 text-center">
                      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl">
                        📷
                      </div>
                      <p className="text-[18px] font-bold text-[#3b3655]">
                        대표 이미지 준비중
                      </p>
                      <p className="mt-2 max-w-[320px] text-[14px] leading-6 text-[#7b7396]">
                        대표사진이 등록되면 이 영역에 바로 보여줄 수 있어요.
                      </p>
                    </div>
                  ) : (
                    <img
                      src={artist.image}
                      alt={artist.name}
                      className="h-full w-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  )}

                  <button
                    type="button"
                    onClick={toggleFavoriteCurrentArtist}
                    className={`absolute right-5 top-5 z-20 inline-flex h-11 items-center justify-center rounded-full border px-4 text-[14px] font-semibold ${
                      isFavorite
                        ? "border-[#ffbdd4] bg-[#ffedf5] text-[#ff5c9a]"
                        : "border-white/70 bg-white/90 text-[#5d5675]"
                    }`}
                  >
                    <span className="mr-2">{isFavorite ? "❤" : "♡"}</span>
                    {isFavorite ? "찜한 작가" : "찜하기"}
                  </button>

                  {portfolioImages.length > 0 ? (
                    <div className="absolute bottom-5 left-5 rounded-full bg-[#2e2548]/75 px-4 py-2 text-[13px] font-semibold text-white">
                      포트폴리오 {portfolioImages.length}장
                    </div>
                  ) : null}
                </div>

                <div className="p-6 md:p-8">
                  <p className="inline-flex rounded-full bg-[#f3ecff] px-3 py-1 text-[12px] font-semibold text-[#7b5cf6]">
                    DAYPIC ARTIST
                  </p>

                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <h1 className="truncate text-[34px] font-black tracking-[-0.05em] text-[#272246]">
                        {artist.name}
                      </h1>

                      {artist.openchat_url ? (
                        <button
                          type="button"
                          onClick={handleContactClick}
                          className="inline-flex h-10 items-center justify-center rounded-full bg-[#6d46f6] px-4 text-[13px] font-semibold text-white whitespace-nowrap"
                        >
                          촬영문의
                        </button>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={toggleFavoriteCurrentArtist}
                      className={`inline-flex h-11 shrink-0 items-center justify-center rounded-[14px] px-4 text-[13px] font-semibold ${
                        isFavorite
                          ? "bg-[#ffedf5] text-[#ff5c9a]"
                          : "bg-[#f3effb] text-[#5b47c8]"
                      }`}
                    >
                      {isFavorite ? "❤ 찜됨" : "♡ 찜하기"}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
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

                    <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
                      <p className="text-[12px] font-semibold text-[#8f84a8]">평점</p>
                      <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                        ★ {(artist.rating ?? 4.8).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-[13px] font-semibold text-[#8f84a8]">작가 키워드</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {keywords.length > 0 ? (
                        keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="inline-flex items-center rounded-full bg-[#f2ebff] px-3 py-1.5 text-[12px] font-medium text-[#6d46f6]"
                          >
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <span className="text-[13px] text-[#8f84a8]">
                          등록된 키워드가 없어요.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={goHome}
                      className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#f3effb] text-[14px] font-semibold text-[#5b47c8]"
                    >
                      다른 작가 더 보기
                    </button>

                    {artist.portfolio ? (
                      <a
                        href={artist.portfolio}
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

            <section className="rounded-[32px] border border-[#ece4f4] bg-white p-5 shadow-[0_16px_40px_rgba(80,60,120,0.06)] md:p-6">
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
                      onClick={() => setSelectedPortfolioIndex(index)}
                      className="group overflow-hidden rounded-[20px] border border-[#ebe4f4] bg-[#faf7ff] text-left"
                    >
                      <img
                        src={imageUrl}
                        alt={`${artist.name} 포트폴리오 ${index + 1}`}
                        className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02] md:h-56"
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
          </div>
        </div>
      </div>

      {artist.openchat_url ? (
        <div
          className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 transition-all duration-300 ${
            showFloatingContact
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-6 opacity-0"
          }`}
        >
          <div className="flex w-full max-w-[920px] items-center gap-3 rounded-[24px] border border-[#e6ddf2] bg-white/95 p-3 shadow-[0_16px_40px_rgba(80,60,120,0.18)] backdrop-blur">
            <button
              type="button"
              onClick={toggleFavoriteCurrentArtist}
              className={`hidden h-12 min-w-[120px] items-center justify-center rounded-[16px] text-[14px] font-semibold md:inline-flex ${
                isFavorite
                  ? "bg-[#ffedf5] text-[#ff5c9a]"
                  : "bg-[#f3effb] text-[#5b47c8]"
              }`}
            >
              {isFavorite ? "❤ 찜됨" : "♡ 찜하기"}
            </button>

            <button
              type="button"
              onClick={handleContactClick}
              className="flex h-12 flex-1 items-center justify-center rounded-[16px] bg-[#6d46f6] px-5 text-[15px] font-bold text-white"
            >
              카카오톡으로 문의하기
            </button>
          </div>
        </div>
      ) : null}

      {selectedPortfolioImage ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6 md:py-8"
          onClick={closePortfolioModal}
        >
          <div
            className="relative flex w-full max-w-6xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {portfolioImages.length > 1 ? (
              <button
                type="button"
                onClick={goToPrevPortfolioImage}
                className="absolute left-2 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[24px] font-bold text-[#2b2745] shadow md:left-4"
                aria-label="이전 이미지"
              >
                ‹
              </button>
            ) : null}

            <div className="relative w-full max-w-5xl">
              <button
                type="button"
                onClick={closePortfolioModal}
                className="absolute right-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[20px] font-bold text-[#2b2745] shadow"
                aria-label="이미지 닫기"
              >
                ×
              </button>

              <div className="absolute left-3 top-3 z-20 rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-semibold text-white">
                {selectedPortfolioIndex !== null ? selectedPortfolioIndex + 1 : 0} / {portfolioImages.length}
              </div>

              <div
                className="overflow-hidden rounded-[24px] bg-white"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={selectedPortfolioImage}
                  alt="확대된 포트폴리오 이미지"
                  className="max-h-[72vh] w-full bg-white object-contain select-none md:max-h-[78vh]"
                  draggable={false}
                />
              </div>

              {portfolioImages.length > 1 ? (
                <div
                  ref={thumbnailStripRef}
                  className="mt-4 flex gap-2 overflow-x-auto pb-1"
                >
                  {portfolioImages.map((imageUrl, index) => {
                    const isActive = index === selectedPortfolioIndex;

                    return (
                      <button
                        key={`${imageUrl}-thumb-${index}`}
                        type="button"
                        data-thumb-index={index}
                        onClick={() => setSelectedPortfolioIndex(index)}
                        className={`shrink-0 overflow-hidden rounded-[14px] border-2 transition ${
                          isActive
                            ? "border-[#6d46f6] ring-2 ring-[#d9ccff]"
                            : "border-white/20 opacity-80 hover:opacity-100"
                        }`}
                        aria-label={`포트폴리오 ${index + 1}번 보기`}
                      >
                        <img
                          src={imageUrl}
                          alt={`${artist.name} 포트폴리오 썸네일 ${index + 1}`}
                          className="h-16 w-16 object-cover md:h-20 md:w-20"
                          draggable={false}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {portfolioImages.length > 1 ? (
              <button
                type="button"
                onClick={goToNextPortfolioImage}
                className="absolute right-2 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[24px] font-bold text-[#2b2745] shadow md:right-4"
                aria-label="다음 이미지"
              >
                ›
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}