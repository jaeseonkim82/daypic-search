"use client";

import { useEffect, useMemo, useState } from "react";
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
  rating?: number;
  keywords?: string[];
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

function joinLabel(value: string[] | string | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" · ") : value;
}

function normalizeArray(value: string[] | string | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function safeParseStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function buildSavedArtist(artist: ArtistDetail): SavedArtist {
  return {
    id: artist.id,
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
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setRecentArtists(safeParseStorage<SavedArtist[]>(RECENT_STORAGE_KEY, []));
    setFavoriteArtists(safeParseStorage<SavedArtist[]>(FAVORITE_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    if (!artistId) return;

    try {
      const raw = window.localStorage.getItem(DETAIL_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Record<string, ArtistDetail>;
      if (parsed[artistId]) {
        setArtist(parsed[artistId]);
        setImageError(false);
      }
    } catch (error) {
      console.error(error);
    }
  }, [artistId]);

  const keywords = useMemo(() => {
    if (!artist?.keywords || artist.keywords.length === 0) {
      return ["친절", "자연스러움", "편안한 진행", "소통 좋음", "감성 톤", "센스 있음"];
    }
    return artist.keywords;
  }, [artist]);

  const isFavorite = useMemo(() => {
    if (!artist) return false;
    return favoriteArtists.some((item) => item.id === artist.id);
  }, [artist, favoriteArtists]);

  function goToArtistDetail(targetId: string) {
    router.push(`/artists/${targetId}`);
  }

  function toggleFavoriteCurrentArtist() {
    if (!artist) return;

    const exists = favoriteArtists.some((item) => item.id === artist.id);

    if (exists) {
      const nextFavorites = favoriteArtists.filter((item) => item.id !== artist.id);
      setFavoriteArtists(nextFavorites);
      saveStorage(FAVORITE_STORAGE_KEY, nextFavorites);
      return;
    }

    const nextFavorites = [buildSavedArtist(artist), ...favoriteArtists].slice(0, 30);
    setFavoriteArtists(nextFavorites);
    saveStorage(FAVORITE_STORAGE_KEY, nextFavorites);
  }

  function removeFavorite(artistIdToRemove: string) {
    const nextFavorites = favoriteArtists.filter((item) => item.id !== artistIdToRemove);
    setFavoriteArtists(nextFavorites);
    saveStorage(FAVORITE_STORAGE_KEY, nextFavorites);
  }

  if (!artist) {
    return (
      <main className="min-h-screen bg-[#f8f5fb] px-5 py-10 text-[#25213d] md:px-8">
        <div className="mx-auto max-w-[960px] rounded-[32px] border border-[#ece4f4] bg-white p-8 text-center shadow-[0_16px_40px_rgba(80,60,120,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7a5cff] to-[#d45abf] text-lg font-black text-white shadow-[0_10px_24px_rgba(122,92,255,0.25)]">
                D
              </div>
              <div className="text-left">
                <p className="text-[24px] font-black leading-none tracking-[-0.05em] text-[#272246]">
                  day<span className="text-[#8b63ff]">pic</span>
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#8a82a6]">
                  wedding artist search
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#e6ddf2] bg-white px-5 text-[14px] font-semibold text-[#5f587a]"
            >
              ← 뒤로가기
            </button>
          </div>

          <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#272246]">
            작가 정보를 불러오지 못했어
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-[#6f6886]">
            검색페이지에서 작가 카드를 눌러 들어오면 상세 정보를 바로 볼 수 있어.
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[14px] bg-[#6d46f6] px-5 text-[14px] font-semibold text-white"
          >
            검색페이지로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5fb] px-5 py-6 text-[#25213d] md:px-8 md:py-8">
      <div className="mx-auto max-w-[1520px]">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-3 self-start"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7a5cff] to-[#d45abf] text-xl font-black text-white shadow-[0_12px_26px_rgba(122,92,255,0.25)]">
              D
            </div>

            <div className="text-left">
              <p className="text-[28px] font-black leading-none tracking-[-0.05em] text-[#272246]">
                day<span className="text-[#8b63ff]">pic</span>
              </p>
              <p className="mt-1 text-[11px] font-medium text-[#8a82a6]">
                wedding artist search
              </p>
            </div>
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
            <section className="rounded-[24px] border border-[#e8e1f2] bg-[#f8f5fc] p-4 shadow-[0_12px_28px_rgba(75,60,110,0.05)]">
              <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#f1eaff] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] text-[#6d46f6]">≡</span>
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
                    최근본작가
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {recentArtists.length > 0 ? (
                  recentArtists.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToArtistDetail(item.id)}
                      className="flex w-full items-center gap-3 rounded-[16px] border border-[#ebe4f4] bg-white px-3 py-3 text-left transition hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(60,50,100,0.08)]"
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
                    아직 최근 본 작가가 없어.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#e8e1f2] bg-[#f8f5fc] p-4 shadow-[0_12px_28px_rgba(75,60,110,0.05)]">
              <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#f1eaff] px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] text-[#ff5c9a]">❤</span>
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
                    찜한 작가
                  </h3>
                </div>
                <span className="text-[12px] font-semibold text-[#7c7497]">
                  {favoriteArtists.length}명
                </span>
              </div>

              <div className="space-y-3">
                {favoriteArtists.length > 0 ? (
                  favoriteArtists.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[16px] border border-[#ebe4f4] bg-white px-3 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => goToArtistDetail(item.id)}
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
                        className="text-[#ff5c9a] transition hover:scale-110"
                        aria-label="찜 해제"
                      >
                        ❤
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-dashed border-[#ddd2ef] bg-white px-4 py-5 text-[12px] text-[#837b9c]">
                    아직 찜한 작가가 없어.
                  </div>
                )}
              </div>
            </section>
          </aside>

          <section className="overflow-hidden rounded-[36px] border border-[#ece4f4] bg-white shadow-[0_18px_44px_rgba(80,60,120,0.08)]">
            <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="relative min-h-[420px] bg-[#f2ebfb]">
                {!artist.image || imageError ? (
                  <div className="flex h-full min-h-[420px] w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#f4edff_0%,#efe7fb_100%)] px-6 text-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl shadow-[0_10px_24px_rgba(80,60,120,0.08)]">
                      📷
                    </div>
                    <p className="text-[18px] font-bold text-[#3b3655]">
                      대표 이미지 준비중
                    </p>
                    <p className="mt-2 max-w-[320px] text-[14px] leading-6 text-[#7b7396]">
                      Airtable의 대표사진 필드에 이미지를 넣으면 이 영역에 바로 보여줄 수 있어.
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
                  className={`absolute right-5 top-5 z-10 inline-flex h-11 items-center justify-center rounded-full border px-4 text-[14px] font-semibold backdrop-blur-sm transition ${
                    isFavorite
                      ? "border-[#ffbdd4] bg-[#ffedf5] text-[#ff5c9a]"
                      : "border-white/70 bg-white/90 text-[#5d5675] hover:bg-white"
                  }`}
                >
                  <span className="mr-2">{isFavorite ? "❤" : "♡"}</span>
                  {isFavorite ? "찜한 작가" : "찜하기"}
                </button>
              </div>

              <div className="p-6 md:p-8">
                <p className="inline-flex rounded-full bg-[#f3ecff] px-3 py-1 text-[12px] font-semibold text-[#7b5cf6]">
                  DAYPIC ARTIST
                </p>

                <div className="mt-4 flex items-start justify-between gap-4">
                  <h1 className="text-[34px] font-black tracking-[-0.05em] text-[#272246]">
                    {artist.name}
                  </h1>

                  <button
                    type="button"
                    onClick={toggleFavoriteCurrentArtist}
                    className={`inline-flex h-11 shrink-0 items-center justify-center rounded-[14px] px-4 text-[13px] font-semibold transition ${
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
                    {keywords.map((keyword) => (
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
                    onClick={() => router.push("/")}
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
                      포트폴리오 바로가기
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
        </div>
      </div>
    </main>
  );
}