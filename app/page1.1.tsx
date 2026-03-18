"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Artist = {
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

const services = ["본식스냅", "서브스냅", "영상촬영", "아이폰스냅", "돌스냅"];

const regions = [
  "서울",
  "경기",
  "인천",
  "세종",
  "대구",
  "부산",
  "경상도",
  "전라도",
  "강원도",
  "충청도",
];

const prices = ["10~50만원", "50~100만원", "100~150만원", "150~200만원"];

const fallbackImages = [
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513278974582-3e1b4a4fa21d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
];

const RECENT_STORAGE_KEY = "daypic_recent_artists";
const FAVORITE_STORAGE_KEY = "daypic_favorite_artists";

function joinLabel(value: string[] | string) {
  if (Array.isArray(value)) return value.join(" · ");
  return value || "";
}

function normalizeArray(value: string[] | string | undefined) {
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

function buildSavedArtist(artist: Artist & { image: string }): SavedArtist {
  return {
    id: artist.id,
    name: artist.name,
    service: normalizeArray(artist.service),
    region: normalizeArray(artist.region),
    price: artist.price,
    portfolio: artist.portfolio,
    image: artist.image,
  };
}

export default function Home() {
  const [date, setDate] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [price, setPrice] = useState("");

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "예식 날짜를 입력하면 촬영 가능한 작가를 바로 찾아볼 수 있어."
  );

  const [recentOpen, setRecentOpen] = useState(true);
  const [favoriteOpen, setFavoriteOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  const [recentArtists, setRecentArtists] = useState<SavedArtist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<SavedArtist[]>([]);

  const serviceDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRecentArtists(safeParseStorage<SavedArtist[]>(RECENT_STORAGE_KEY, []));
    setFavoriteArtists(safeParseStorage<SavedArtist[]>(FAVORITE_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(event.target as Node)
      ) {
        setServiceDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const cards = useMemo(() => {
    return artists.map((artist, index) => ({
      ...artist,
      image: artist.image || fallbackImages[index % fallbackImages.length],
      rating: artist.rating ?? 4.8,
      keywords:
        artist.keywords && artist.keywords.length > 0
          ? artist.keywords.slice(0, 3)
          : ["편안한 분위기", "친절한 소통", "자연스러운 촬영"],
    }));
  }, [artists]);

  const selectedServiceLabel = useMemo(() => {
    if (selectedServices.length === 0) return "촬영 서비스";
    if (selectedServices.length === 1) return selectedServices[0];
    return `${selectedServices[0]} 외 ${selectedServices.length - 1}`;
  }, [selectedServices]);

  const isFavorite = useCallback(
    (artistId: string) => favoriteArtists.some((artist) => artist.id === artistId),
    [favoriteArtists]
  );

  const handleSearch = useCallback(async () => {
    if (!date) {
      setArtists([]);
      setMessage("먼저 예식 날짜를 입력해줘.");
      return;
    }

    setLoading(true);
    setMessage("가능한 작가를 찾는 중이야...");

    try {
      const params = new URLSearchParams();

      if (date) params.set("date", date);
      if (region) params.set("region", region);
      if (price) params.set("price", price);

      // route.ts를 아직 다중 서비스 대응으로 바꾸지 않았으므로
      // 우선 첫 번째 서비스만 전송
      if (selectedServices.length > 0) {
        params.set("service", selectedServices[0]);
      }

      const response = await fetch(`/api/search?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "검색 중 오류가 발생했어.");
      }

      const nextArtists: Artist[] = data.artists || [];
      setArtists(nextArtists);

      if (nextArtists.length === 0) {
        setMessage("조건에 맞는 작가가 없었어.");
      } else {
        setMessage(`총 ${nextArtists.length}명의 작가를 찾았어.`);
      }
    } catch (error) {
      console.error(error);
      setArtists([]);
      setMessage(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어."
      );
    } finally {
      setLoading(false);
    }
  }, [date, selectedServices, region, price]);

  useEffect(() => {
    if (!date) return;
    handleSearch();
  }, [date, selectedServices, region, price, handleSearch]);

  function toggleService(serviceName: string) {
    setSelectedServices((prev) => {
      if (prev.includes(serviceName)) {
        return prev.filter((item) => item !== serviceName);
      }
      return [...prev, serviceName];
    });
  }

  function clearServices() {
    setSelectedServices([]);
  }

  function handleCardClick(artist: Artist & { image: string }) {
    if (!artist.portfolio) return;

    const nextRecent = [
      buildSavedArtist(artist),
      ...recentArtists.filter((item) => item.id !== artist.id),
    ].slice(0, 10);

    setRecentArtists(nextRecent);
    saveStorage(RECENT_STORAGE_KEY, nextRecent);

    window.open(artist.portfolio, "_blank", "noopener,noreferrer");
  }

  function handleToggleFavorite(
    event: React.MouseEvent<HTMLButtonElement>,
    artist: Artist & { image: string }
  ) {
    event.stopPropagation();

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

  function handlePortfolioButtonClick(
    event: React.MouseEvent<HTMLButtonElement>,
    artist: Artist & { image: string }
  ) {
    event.stopPropagation();
    handleCardClick(artist);
  }

  function removeFavorite(
    event: React.MouseEvent<HTMLButtonElement>,
    artistId: string
  ) {
    event.stopPropagation();
    const nextFavorites = favoriteArtists.filter((item) => item.id !== artistId);
    setFavoriteArtists(nextFavorites);
    saveStorage(FAVORITE_STORAGE_KEY, nextFavorites);
  }

  return (
    <main className="min-h-screen bg-[#f6f3fb] text-[#25213d]">
      <header className="border-b border-[#e8e1f2] bg-[#f6f3fb]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 md:px-8">
          <div className="flex items-center gap-8">
            <a
              href="http://ddaypic.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center"
            >
              <span className="text-[28px] font-black tracking-[-0.05em] text-[#2b2a69]">
                Day
              </span>
              <span className="text-[28px] font-black tracking-[-0.05em] text-[#7b5cf6]">
                Pic
              </span>
            </a>

            <nav className="hidden items-center gap-8 md:flex">
              <span className="text-base font-medium text-[#4c4865]">이벤트참여</span>
              <span className="text-base font-medium text-[#4c4865]">촬영후기</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 pb-14 pt-10 md:px-8">
        <section className="mb-8">
          <h1 className="text-4xl font-bold tracking-[-0.04em] text-[#272246] md:text-5xl">
            작가찾기
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#6c6786]">
            내 결혼식 날짜에 촬영 가능한 작가를 바로 찾아보세요.
            <br className="hidden md:block" />
            날짜를 입력하고 조건을 고르면 가능한 작가 리스트가 바로 바뀌어요.
          </p>
        </section>

        <section className="sticky top-0 z-30 mb-10 bg-[#f6f3fb] pb-4">
          <div className="rounded-[24px] border border-[#e8e1f2] bg-white px-4 py-[12px] shadow-[0_10px_30px_rgba(60,50,100,0.06)] md:px-6">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.1fr_1.1fr_0.8fr_0.8fr_116px] xl:items-center xl:gap-0">
              <div className="xl:pr-4">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`h-[44px] w-full rounded-[18px] border px-4 text-[16px] text-[#2c2843] outline-none transition ${
                    date
                      ? "border-[#7b5cf6] bg-[#faf7ff] shadow-[0_0_0_3px_rgba(123,92,246,0.08)]"
                      : "border-[#ece6f4] bg-[#fcfbfe]"
                  }`}
                />
              </div>

              <div
                ref={serviceDropdownRef}
                className="relative xl:border-l xl:border-[#eee7f5] xl:px-4"
              >
                <button
                  type="button"
                  onClick={() => setServiceDropdownOpen((prev) => !prev)}
                  className={`flex h-[44px] w-full items-center justify-between rounded-[18px] border px-4 text-[16px] outline-none transition xl:border-0 xl:bg-transparent ${
                    selectedServices.length > 0 || serviceDropdownOpen
                      ? "border-[#7b5cf6] bg-[#faf7ff] text-[#2c2843] shadow-[0_0_0_3px_rgba(123,92,246,0.08)]"
                      : "border-[#ece6f4] bg-[#fcfbfe] text-[#2c2843]"
                  }`}
                >
                  <span className="truncate">{selectedServiceLabel}</span>
                  <span className="ml-3 shrink-0 text-[#756ea0]">
                    {serviceDropdownOpen ? "⌃" : "⌄"}
                  </span>
                </button>

                {serviceDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[52px] z-40 rounded-[20px] border border-[#e8e1f2] bg-white p-4 shadow-[0_18px_40px_rgba(60,50,100,0.14)] xl:left-4 xl:right-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[14px] font-semibold text-[#2b2745]">
                        촬영 서비스 선택
                      </p>
                      <button
                        type="button"
                        onClick={clearServices}
                        className="text-[13px] font-medium text-[#7b5cf6] hover:opacity-80"
                      >
                        초기화
                      </button>
                    </div>

                    <div className="space-y-2">
                      {services.map((item) => {
                        const active = selectedServices.includes(item);

                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleService(item)}
                            className={`flex w-full items-center justify-between rounded-[14px] border px-3 py-3 text-left text-[15px] transition ${
                              active
                                ? "border-[#7b5cf6] bg-[#f5f0ff] text-[#4c2fe0]"
                                : "border-[#ece6f4] bg-[#fcfbfe] text-[#3b3653] hover:bg-[#f8f4fe]"
                            }`}
                          >
                            <span>{item}</span>
                            <span className="ml-3">{active ? "✓" : ""}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="xl:border-l xl:border-[#eee7f5] xl:px-4">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={`h-[44px] w-full rounded-[18px] border px-4 text-[16px] text-[#2c2843] outline-none transition xl:border-0 xl:bg-transparent ${
                    region
                      ? "border-[#7b5cf6] bg-[#faf7ff] shadow-[0_0_0_3px_rgba(123,92,246,0.08)]"
                      : "border-[#ece6f4] bg-[#fcfbfe]"
                  }`}
                >
                  <option value="">촬영 지역</option>
                  {regions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:border-l xl:border-[#eee7f5] xl:px-4">
                <select
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`h-[44px] w-full rounded-[18px] border px-4 text-[16px] text-[#2c2843] outline-none transition xl:border-0 xl:bg-transparent ${
                    price
                      ? "border-[#7b5cf6] bg-[#faf7ff] shadow-[0_0_0_3px_rgba(123,92,246,0.08)]"
                      : "border-[#ece6f4] bg-[#fcfbfe]"
                  }`}
                >
                  <option value="">예산</option>
                  {prices.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:pl-4">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className={`h-[44px] w-full rounded-[18px] text-[15px] font-semibold text-white transition ${
                    loading
                      ? "bg-[#6c63a7]"
                      : "bg-[#2f2d57] shadow-[0_10px_20px_rgba(47,45,87,0.18)] hover:-translate-y-[1px] hover:opacity-95"
                  }`}
                >
                  {loading ? "검색 중" : "검색"}
                </button>
              </div>
            </div>

            {selectedServices.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedServices.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleService(item)}
                    className="inline-flex items-center rounded-full bg-[#f1eaff] px-3 py-1.5 text-[13px] font-medium text-[#6d46f6] transition hover:bg-[#eadfff]"
                  >
                    {item}
                    <span className="ml-2">✕</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[24px] border border-[#e8e1f2] bg-[#f8f5fc] p-5">
            <div
              onClick={() => setRecentOpen(!recentOpen)}
              className={`mb-4 flex cursor-pointer items-center justify-between rounded-[18px] px-2 py-2 transition ${
                recentOpen ? "bg-[#f1eaff]" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[16px] text-[#6d46f6]">≡</span>
                <h3 className="text-[22px] font-bold tracking-[-0.03em] text-[#2b2745]">
                  최근본작가
                </h3>
              </div>
              <span className="text-[#6f6892]">{recentOpen ? "⌄" : "›"}</span>
            </div>

            {recentOpen && (
              <div className="space-y-3">
                {recentArtists.length > 0 ? (
                  recentArtists.map((artist) => (
                    <a
                      key={artist.id}
                      href={artist.portfolio || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center rounded-[18px] border border-[#ebe4f4] bg-white px-3 py-3 transition hover:-translate-y-[1px] hover:border-[#d9cdf1] hover:shadow-[0_10px_24px_rgba(60,50,100,0.08)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-full">
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-[15px] font-medium text-[#3f3a59]">
                            {artist.name}
                          </span>
                          <span className="block truncate text-[13px] text-[#7a7393]">
                            {joinLabel(artist.region)}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#ddd2ef] bg-white px-4 py-5 text-[14px] text-[#837b9c]">
                    아직 최근 본 작가가 없어.
                  </div>
                )}
              </div>
            )}
          </aside>

          <div>
            <div className="mb-5 flex flex-col gap-4 border-b border-[#e7e0f0] pb-5 md:flex-row md:items-start md:justify-between">
              <p className="text-[24px] font-semibold tracking-[-0.04em] text-[#2a2645] md:text-[28px]">
                {message}
              </p>

              <div className="relative">
                <button
                  onClick={() => setFavoriteOpen(!favoriteOpen)}
                  className={`inline-flex h-11 items-center justify-center rounded-[16px] px-5 text-[15px] font-semibold transition ${
                    favoriteOpen
                      ? "bg-[#6d46f6] text-white shadow-[0_12px_24px_rgba(109,70,246,0.2)]"
                      : "bg-[#f1eaff] text-[#6d46f6] hover:bg-[#e8ddff]"
                  }`}
                >
                  <span className="mr-2">❤</span>
                  찜한 작가 보기 ({favoriteArtists.length})
                  <span className="ml-2">{favoriteOpen ? "⌄" : "›"}</span>
                </button>

                {favoriteOpen && (
                  <div className="absolute right-0 top-[52px] z-30 w-[300px] rounded-[20px] border border-[#e8e1f2] bg-white p-4 shadow-[0_16px_40px_rgba(60,50,100,0.12)]">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-[16px] font-semibold text-[#2b2745]">
                        찜한 작가
                      </h4>
                      <span className="text-[14px] text-[#7a7393]">
                        {favoriteArtists.length}명
                      </span>
                    </div>

                    <div className="space-y-3">
                      {favoriteArtists.length > 0 ? (
                        favoriteArtists.map((artist) => (
                          <a
                            key={artist.id}
                            href={artist.portfolio || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-[14px] border border-[#efe8f7] bg-[#fcfbfe] px-3 py-3 transition hover:border-[#ddcff2] hover:bg-white"
                          >
                            <div className="h-11 w-11 overflow-hidden rounded-full">
                              <img
                                src={artist.image}
                                alt={artist.name}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[15px] font-medium text-[#3f3a59]">
                                {artist.name}
                              </p>
                              <p className="truncate text-[13px] text-[#7a7393]">
                                {joinLabel(artist.service)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => removeFavorite(event, artist.id)}
                              className="text-[#ff5c9a] transition hover:scale-110"
                              aria-label="찜 해제"
                            >
                              ❤
                            </button>
                          </a>
                        ))
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-[#e5dcf2] px-4 py-5 text-[14px] text-[#837b9c]">
                          아직 찜한 작가가 없어.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {cards.length > 0 ? (
                cards.map((artist) => {
                  const favorite = isFavorite(artist.id);

                  return (
                    <article
                      key={artist.id}
                      onClick={() => handleCardClick(artist)}
                      className={`group overflow-hidden rounded-[22px] border bg-white transition ${
                        artist.portfolio
                          ? "cursor-pointer border-[#e6dff0] shadow-[0_10px_30px_rgba(60,50,100,0.05)] hover:-translate-y-[3px] hover:border-[#d7c9f0] hover:shadow-[0_18px_36px_rgba(60,50,100,0.11)]"
                          : "cursor-default border-[#ece6f4] shadow-[0_8px_20px_rgba(60,50,100,0.04)]"
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-[#f1ebf8]">
                        <img
                          src={artist.image}
                          alt={artist.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                        />

                        <button
                          type="button"
                          onClick={(event) => handleToggleFavorite(event, artist)}
                          className={`absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-sm transition ${
                            favorite
                              ? "border-[#ffb6d0] bg-[#ffedf5] text-[#ff5c9a]"
                              : "border-white/70 bg-white/85 text-[#6a617f] hover:bg-white"
                          }`}
                          aria-label={favorite ? "찜 해제" : "찜하기"}
                        >
                          {favorite ? "❤" : "♡"}
                        </button>

                        {artist.portfolio && (
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-4 pb-4 pt-10 opacity-0 transition group-hover:opacity-100">
                            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-semibold text-[#2f2d57]">
                              포트폴리오 보기
                              <span className="ml-2">›</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="line-clamp-1 text-[20px] font-semibold tracking-[-0.03em] text-[#272347]">
                          {artist.name}
                        </h3>

                        <p className="mt-1 line-clamp-1 text-[14px] text-[#5f587a]">
                          {joinLabel(artist.region)} · {joinLabel(artist.service)}
                        </p>

                        <p className="mt-1 text-[14px] font-medium text-[#4b4468]">
                          {artist.price}
                        </p>

                        <div className="mt-3 flex items-center gap-2 text-[14px] text-[#6d6786]">
                          <span className="font-semibold text-[#f3a51c]">
                            ★ {artist.rating?.toFixed(1)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {artist.keywords?.slice(0, 3).map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full bg-[#f1eaff] px-2.5 py-1 text-[12px] font-medium text-[#7652ea]"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(event) => handlePortfolioButtonClick(event, artist)}
                          disabled={!artist.portfolio}
                          className={`mt-4 inline-flex h-10 w-full items-center justify-center rounded-[14px] text-[14px] font-semibold transition ${
                            artist.portfolio
                              ? "bg-[#6d46f6] text-white hover:opacity-95"
                              : "bg-[#ece8f6] text-[#9a93b1]"
                          }`}
                        >
                          {artist.portfolio ? "포트폴리오 보기" : "포트폴리오 준비중"}
                          <span className="ml-2">›</span>
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="col-span-full rounded-[24px] border border-[#e6dff0] bg-white p-10 text-center text-lg text-[#756f8d]">
                  아직 표시할 검색 결과가 없어.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}