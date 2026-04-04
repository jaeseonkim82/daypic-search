"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  openchat_url?: string;
  portfolio_images?: string[] | string;

  // ✅ 영상 관련 필드
  video_link_1?: string;
  video_link_2?: string;
  video_link_3?: string;
  video_link_4?: string;
  video_thumbnail?: string;
  artist_type?: string;
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

type SearchPageState = {
  date: string;
  selectedServices: string[];
  region: string;
  price: string;
  artists: Artist[];
  hasSearched: boolean;
  message: string;
  scrollY: number;
};

const SERVICES = ["본식스냅", "서브스냅", "영상촬영", "아이폰스냅", "돌스냅"];

const REGIONS = [
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

const PRICES = ["10~50만원", "50~100만원", "100~150만원", "150~200만원"];

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513278974582-3e1b4a4fa21d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80",
];

const DEFAULT_KEYWORDS = [
  "친절",
  "자연스러움",
  "편안한 진행",
  "소통 좋음",
  "감성 톤",
  "센스 있음",
];

const RECENT_STORAGE_KEY = "daypic_recent_artists";
const FAVORITE_STORAGE_KEY = "daypic_favorite_artists";
const DETAIL_STORAGE_KEY = "daypic_artist_detail_cache";
const SEARCH_PAGE_STATE_KEY = "daypic_search_page_state";

function joinLabel(value: string[] | string | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" · ") : value;
}

function normalizeArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
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

function buildSavedArtist(artist: Artist): SavedArtist {
  return {
    id: String(artist.id),
    name: artist.name,
    service: normalizeArray(artist.service),
    region: normalizeArray(artist.region),
    price: artist.price,
    portfolio: artist.portfolio,
    image: artist.image || artist.video_thumbnail || "",
  };
}

function normalizeArtistFromApi(rawArtist: Record<string, any>): Artist {
  const keywordsSource =
    rawArtist.keywords ??
    rawArtist["성향키워드"] ??
    rawArtist["작가 키워드"] ??
    rawArtist["artist_keywords"];

  const imageValue =
    rawArtist.image ??
    rawArtist["대표사진"] ??
    rawArtist["image_url"] ??
    "";

  const openchatValue =
    rawArtist.openchat_url ??
    rawArtist["openchat_url"] ??
    rawArtist["오픈카톡"] ??
    "";

  const portfolioImagesValue =
    rawArtist.portfolio_images ??
    rawArtist["portfolio_images"] ??
    rawArtist["포트폴리오이미지"] ??
    rawArtist["포트폴리오 이미지"] ??
    "";

  const portfolioValue = rawArtist.portfolio ?? rawArtist["포트폴리오"] ?? "";

  const ratingValue =
    typeof rawArtist.rating === "number"
      ? rawArtist.rating
      : typeof rawArtist["평점"] === "number"
      ? rawArtist["평점"]
      : 4.8;

  return {
    id: String(rawArtist.id ?? ""),
    name: String(
      rawArtist.name ??
        rawArtist["작가 또는 업체명"] ??
        rawArtist["업체명"] ??
        "이름 없는 작가"
    ),
    email: String(rawArtist.email ?? ""),
    service: normalizeArray(
      rawArtist.service ?? rawArtist["촬영서비스"] ?? rawArtist["service"]
    ),
    region: normalizeArray(
      rawArtist.region ?? rawArtist["촬영지역"] ?? rawArtist["region"]
    ),
    price: String(rawArtist.price ?? rawArtist["촬영비용"] ?? "-"),
    portfolio: portfolioValue ? String(portfolioValue) : "",
    image: imageValue ? String(imageValue) : "",
    rating: ratingValue,
    keywords: normalizeArray(keywordsSource),
    openchat_url: openchatValue ? String(openchatValue) : "",
    portfolio_images: portfolioImagesValue,

    // ✅ 영상 관련 필드
    video_link_1: String(rawArtist.video_link_1 ?? ""),
    video_link_2: String(rawArtist.video_link_2 ?? ""),
    video_link_3: String(rawArtist.video_link_3 ?? ""),
    video_link_4: String(rawArtist.video_link_4 ?? ""),
    video_thumbnail: String(rawArtist.video_thumbnail ?? ""),
    artist_type: String(rawArtist.artist_type ?? ""),
  };
}

function getPrimaryVideoLink(artist: Artist): string {
  return (
    artist.video_link_1 ||
    artist.video_link_2 ||
    artist.video_link_3 ||
    artist.video_link_4 ||
    ""
  );
}

function isPureVideoSearch(selectedServices: string[]) {
  return selectedServices.length === 1 && selectedServices[0] === "영상촬영";
}

export default function HomePage() {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [price, setPrice] = useState("");

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [message, setMessage] = useState(
    "예식 날짜와 조건을 입력하면 촬영 가능한 작가를 바로 찾아볼 수 있어요."
  );

  const [recentArtists, setRecentArtists] = useState<SavedArtist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<SavedArtist[]>([]);

  const [recentOpen, setRecentOpen] = useState(true);
  const [favoriteOpen, setFavoriteOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);

  const serviceDropdownRef = useRef<HTMLDivElement | null>(null);
  const favoriteDropdownRef = useRef<HTMLDivElement | null>(null);
  const initialRestoreDoneRef = useRef(false);
  const pendingScrollRestoreRef = useRef<number | null>(null);

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
    const savedPageState = parseStorage<SearchPageState | null>(
      window.sessionStorage,
      SEARCH_PAGE_STATE_KEY,
      null
    );

    setRecentArtists(recent);
    setFavoriteArtists(favorite);

    if (savedPageState) {
      setDate(savedPageState.date || "");
      setSelectedServices(savedPageState.selectedServices || []);
      setRegion(savedPageState.region || "");
      setPrice(savedPageState.price || "");
      setArtists(Array.isArray(savedPageState.artists) ? savedPageState.artists : []);
      setHasSearched(!!savedPageState.hasSearched);
      setMessage(
        savedPageState.message ||
          "예식 날짜와 조건을 입력하면 촬영 가능한 작가를 바로 찾아볼 수 있어요."
      );
      pendingScrollRestoreRef.current =
        typeof savedPageState.scrollY === "number" ? savedPageState.scrollY : 0;
    }

    initialRestoreDoneRef.current = true;
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(target)
      ) {
        setServiceDropdownOpen(false);
      }

      if (
        favoriteDropdownRef.current &&
        !favoriteDropdownRef.current.contains(target)
      ) {
        setFavoriteOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const displayArtists = useMemo(() => {
    return artists.map((artist, index) => {
      const safeKeywords =
        artist.keywords && artist.keywords.length > 0
          ? artist.keywords
          : DEFAULT_KEYWORDS;

      return {
        ...artist,
        id: String(artist.id),
        image: artist.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
        video_thumbnail:
          artist.video_thumbnail || artist.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
        rating: typeof artist.rating === "number" ? artist.rating : 4.8,
        keywords: safeKeywords,
        openchat_url: artist.openchat_url || "",
        portfolio_images: artist.portfolio_images || "",
      };
    });
  }, [artists]);

  const selectedServiceLabel = useMemo(() => {
    if (selectedServices.length === 0) return "촬영 서비스 선택";
    if (selectedServices.length === 1) return selectedServices[0];
    return `${selectedServices[0]} 외 ${selectedServices.length - 1}`;
  }, [selectedServices]);

  const resultCountLabel = useMemo(() => {
    if (!hasSearched) return "실시간";
    return `${displayArtists.length}명`;
  }, [displayArtists.length, hasSearched]);

  const pureVideoSearch = useMemo(
    () => isPureVideoSearch(selectedServices),
    [selectedServices]
  );

  function saveSearchPageState(scrollY?: number) {
    if (typeof window === "undefined") return;
    if (!initialRestoreDoneRef.current) return;

    const nextState: SearchPageState = {
      date,
      selectedServices,
      region,
      price,
      artists,
      hasSearched,
      message,
      scrollY: typeof scrollY === "number" ? scrollY : window.scrollY || 0,
    };

    writeStorage(window.sessionStorage, SEARCH_PAGE_STATE_KEY, nextState);
  }

  useEffect(() => {
    if (!initialRestoreDoneRef.current) return;
    saveSearchPageState();
  }, [date, selectedServices, region, price, artists, hasSearched, message]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initialRestoreDoneRef.current) return;

    const onScroll = () => {
      saveSearchPageState(window.scrollY);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [date, selectedServices, region, price, artists, hasSearched, message]);

  useEffect(() => {
    if (pendingScrollRestoreRef.current === null) return;

    const targetY = pendingScrollRestoreRef.current;
    pendingScrollRestoreRef.current = null;

    const timer = window.setTimeout(() => {
      window.scrollTo({
        top: targetY,
        behavior: "auto",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [displayArtists.length]);

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

  function confirmServices() {
    setServiceDropdownOpen(false);
  }

  function saveRecentArtist(artist: Artist) {
    if (typeof window === "undefined") return;

    const nextRecent = [
      buildSavedArtist(artist),
      ...recentArtists.filter((item) => item.id !== String(artist.id)),
    ].slice(0, 10);

    setRecentArtists(nextRecent);
    writeStorage(window.localStorage, RECENT_STORAGE_KEY, nextRecent);
  }

  function saveArtistDetailCache(artist: Artist) {
    if (typeof window === "undefined") return;

    const currentCache = parseStorage<Record<string, any>>(
      window.localStorage,
      DETAIL_STORAGE_KEY,
      {}
    );

    const nextCache = {
      ...currentCache,
      [String(artist.id)]: {
        ...artist,
        id: String(artist.id),
        keywords: artist.keywords || [],
        성향키워드: artist.keywords || [],
        openchat_url: artist.openchat_url || "",
        portfolio_images: artist.portfolio_images || "",
        video_link_1: artist.video_link_1 || "",
        video_link_2: artist.video_link_2 || "",
        video_link_3: artist.video_link_3 || "",
        video_link_4: artist.video_link_4 || "",
        video_thumbnail: artist.video_thumbnail || "",
        artist_type: artist.artist_type || "",
      },
    };

    writeStorage(window.localStorage, DETAIL_STORAGE_KEY, nextCache);
  }

  function goToArtistDetail(artist: Artist) {
    saveSearchPageState(window.scrollY);
    saveRecentArtist(artist);
    saveArtistDetailCache(artist);
    router.push(`/artists/${String(artist.id)}`);
  }

  function isFavorite(artistId: string) {
    return favoriteArtists.some((artist) => artist.id === artistId);
  }

  function toggleFavorite(event: React.MouseEvent<HTMLButtonElement>, artist: Artist) {
    event.stopPropagation();

    if (typeof window === "undefined") return;

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

  function removeFavorite(event: React.MouseEvent<HTMLButtonElement>, artistId: string) {
    event.stopPropagation();

    if (typeof window === "undefined") return;

    const nextFavorites = favoriteArtists.filter((item) => item.id !== artistId);
    setFavoriteArtists(nextFavorites);
    writeStorage(window.localStorage, FAVORITE_STORAGE_KEY, nextFavorites);
  }

  async function handleSearch() {
    if (!date) {
      setArtists([]);
      setHasSearched(false);
      setMessage("먼저 예식 날짜를 입력해주세요.");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setMessage("가능한 작가를 찾는 중이예요...");

    try {
      const params = new URLSearchParams();
      params.set("date", date);

      if (region) params.set("region", region);
      if (price) params.set("price", price);

      selectedServices.forEach((service) => {
        params.append("service", service);
      });

      const response = await fetch(`/api/search?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "검색 중 오류가 발생했어요.");
      }

      const normalizedArtists: Artist[] = Array.isArray(data.artists)
        ? data.artists.map((item: Record<string, any>) => normalizeArtistFromApi(item))
        : [];

      setArtists(normalizedArtists);

      if (normalizedArtists.length === 0) {
        setMessage("조건에 맞는 작가가 없어요.");
      } else {
        setMessage(`총 ${normalizedArtists.length}명의 작가를 찾았어요.`);
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
  }

  function handleChecklistClick() {
    saveSearchPageState(window.scrollY);
    router.push("/checklist");
  }

  function handleTipsClick() {
    saveSearchPageState(window.scrollY);
    router.push("/tips");
  }

  return (
    <main className="min-h-screen bg-[#faf7fc] text-[#251f3c]">
      <header className="sticky top-0 z-40 border-b border-[#ece4f5] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between px-5 py-4 md:px-8">
          <a
            href="https://ddaypic.com"
            className="inline-flex items-center transition hover:opacity-80"
          >
            <img
              src="/daypic_logo.png"
              alt="daypic logo"
              className="h-11 w-auto object-contain"
            />
          </a>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={handleChecklistClick}
              className="rounded-full border border-[#e8ddf5] bg-white px-3 py-2 text-[12px] font-semibold text-[#665d82]"
            >
              체크리스트
            </button>
            <button
              type="button"
              onClick={handleTipsClick}
              className="rounded-full border border-[#e8ddf5] bg-white px-3 py-2 text-[12px] font-semibold text-[#665d82]"
            >
              본식꿀팁
            </button>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={handleChecklistClick}
              className="rounded-full border border-[#e8ddf5] bg-white px-4 py-2 text-[13px] font-semibold text-[#665d82]"
            >
              결혼준비 체크리스트
            </button>
            <button
              type="button"
              onClick={handleTipsClick}
              className="rounded-full border border-[#e8ddf5] bg-white px-4 py-2 text-[13px] font-semibold text-[#665d82]"
            >
              꿀팁 콘텐츠
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1540px] px-5 pb-12 pt-6 md:px-8 md:pt-8">
        <section className="relative rounded-[40px] border border-[#eee5f7] bg-[radial-gradient(circle_at_top_left,_rgba(164,133,255,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(244,170,214,0.18),_transparent_25%),linear-gradient(135deg,_#ffffff_0%,_#fcf9ff_45%,_#f8f3fb_100%)] p-5 shadow-[0_18px_50px_rgba(95,71,147,0.08)] md:p-8 xl:p-10">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.95fr]">
            <div className="max-w-[700px]">
              <p className="mb-3 inline-flex rounded-full border border-[#eadff8] bg-white/80 px-4 py-2 text-[12px] font-semibold text-[#7a5cf6] shadow-sm">
                DAYPIC SEARCH
              </p>

              <h1 className="text-[34px] font-black leading-[1.18] tracking-[-0.06em] text-[#2a2444] md:text-[56px]">
                내 결혼식 촬영
                <br />
                가능한 작가 찾기
              </h1>

              <p className="mt-4 max-w-[560px] text-[15px] leading-7 text-[#6f6888] md:text-[17px]">
                촬영 날짜와 조건을 입력하면 가능한 작가를 빠르게 검색할 수 있어요.
                데이픽에서 예식 분위기에 맞는 작가를 바로 찾아봐요.
              </p>

              <div className="mt-7 max-w-[580px] rounded-[28px] border border-[#eee4f7] bg-white/95 p-4 shadow-[0_16px_36px_rgba(94,72,145,0.10)] md:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="px-1 text-[13px] font-semibold text-[#7a7297]">
                      예식 날짜
                    </label>

                    <div className="relative">
  <input
    type={date ? "date" : "text"}
    value={date}
    placeholder="날짜 선택"
    onFocus={(e) => (e.target.type = "date")}
    onBlur={(e) => {
      if (!date) e.target.type = "text";
    }}
    onChange={(e) => setDate(e.target.value)}
    className={`relative h-[52px] w-full rounded-[16px] border px-4 text-[15px] text-[#2c2843] placeholder:text-[#a59bbd] outline-none transition appearance-none ${
      date
        ? "border-[#8a63ff] bg-[#faf7ff] shadow-[0_0_0_3px_rgba(138,99,255,0.08)]"
        : "border-[#ece5f5] bg-[#fcfbfe]"
    }`}
  />
</div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="px-1 text-[13px] font-semibold text-[#7a7297]">
                      촬영 서비스
                    </label>

                    <div ref={serviceDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setServiceDropdownOpen((prev) => !prev)}
                        className={`flex h-[52px] w-full items-center justify-between rounded-[16px] border px-4 text-[15px] transition ${
                          selectedServices.length > 0 || serviceDropdownOpen
                            ? "border-[#8a63ff] bg-[#faf7ff] text-[#2c2843] shadow-[0_0_0_3px_rgba(138,99,255,0.08)]"
                            : "border-[#ece5f5] bg-[#fcfbfe] text-[#2c2843]"
                        }`}
                      >
                        <span className="truncate">{selectedServiceLabel}</span>
                        <span className="ml-3 shrink-0 text-[#7a7297]">
                          {serviceDropdownOpen ? "⌃" : "⌄"}
                        </span>
                      </button>

                      {serviceDropdownOpen && (
                        <div className="absolute left-0 right-0 top-[58px] z-30 rounded-[20px] border border-[#e8dff2] bg-white p-4 shadow-[0_18px_40px_rgba(70,55,110,0.14)]">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[14px] font-semibold text-[#2b2745]">
                              촬영 서비스 선택
                            </p>
                            <button
                              type="button"
                              onClick={clearServices}
                              className="text-[13px] font-medium text-[#7b5cf6]"
                            >
                              초기화
                            </button>
                          </div>

                          <div className="space-y-2">
                            {SERVICES.map((item) => {
                              const active = selectedServices.includes(item);

                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => toggleService(item)}
                                  className={`flex w-full items-center justify-between rounded-[14px] border px-3 py-3 text-left text-[14px] transition ${
                                    active
                                      ? "border-[#7b5cf6] bg-[#f5f0ff] text-[#4d33da]"
                                      : "border-[#ece5f5] bg-[#fcfbfe] text-[#3e3858]"
                                  }`}
                                >
                                  <span>{item}</span>
                                  <span
                                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[12px] ${
                                      active
                                        ? "bg-[#7b5cf6] text-white"
                                        : "border border-[#d8cfee] text-transparent"
                                    }`}
                                  >
                                    ✓
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={clearServices}
                              className="h-11 rounded-[14px] border border-[#e5dcf3] bg-[#faf8fd] text-[14px] font-semibold text-[#6f6888]"
                            >
                              전체해제
                            </button>

                            <button
                              type="button"
                              onClick={confirmServices}
                              className="h-11 rounded-[14px] bg-gradient-to-r from-[#7b5cf6] to-[#d75eb6] text-[14px] font-semibold text-white"
                            >
                              선택 완료
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="px-1 text-[13px] font-semibold text-[#7a7297]">
                      지역
                    </label>

                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={`h-[52px] w-full rounded-[16px] border px-4 text-[15px] text-[#2c2843] outline-none transition ${
                        region
                          ? "border-[#8a63ff] bg-[#faf7ff] shadow-[0_0_0_3px_rgba(138,99,255,0.08)]"
                          : "border-[#ece5f5] bg-[#fcfbfe]"
                      }`}
                    >
                      <option value="">지역 선택</option>
                      {REGIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="px-1 text-[13px] font-semibold text-[#7a7297]">
                      예산 범위
                    </label>

                    <select
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={`h-[52px] w-full rounded-[16px] border px-4 text-[15px] text-[#2c2843] outline-none transition ${
                        price
                          ? "border-[#8a63ff] bg-[#faf7ff] shadow-[0_0_0_3px_rgba(138,99,255,0.08)]"
                          : "border-[#ece5f5] bg-[#fcfbfe]"
                      }`}
                    >
                      <option value="">예산 범위 선택</option>
                      {PRICES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className={`mt-4 h-[54px] w-full rounded-[16px] text-[16px] font-bold text-white transition ${
                    loading
                      ? "bg-[#a393cc]"
                      : "bg-gradient-to-r from-[#7b5cf6] to-[#d75eb6]"
                  }`}
                >
                  {loading ? "작가 검색 중..." : "작가 검색"}
                </button>

                {(selectedServices.length > 0 || region || price) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedServices.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleService(item)}
                        className="rounded-full bg-[#f1e9ff] px-3 py-1.5 text-[12px] font-medium text-[#6d46f6]"
                      >
                        {item} <span className="ml-1">✕</span>
                      </button>
                    ))}

                    {region && (
                      <button
                        type="button"
                        onClick={() => setRegion("")}
                        className="rounded-full bg-[#f1e9ff] px-3 py-1.5 text-[12px] font-medium text-[#6d46f6]"
                      >
                        {region} <span className="ml-1">✕</span>
                      </button>
                    )}

                    {price && (
                      <button
                        type="button"
                        onClick={() => setPrice("")}
                        className="rounded-full bg-[#f1e9ff] px-3 py-1.5 text-[12px] font-medium text-[#6d46f6]"
                      >
                        {price} <span className="ml-1">✕</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 self-start">
              <div className="flex min-h-[122px] items-center gap-4 rounded-[28px] border border-[#eee3f7] bg-white/95 p-5 shadow-[0_14px_30px_rgba(83,63,125,0.08)]">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#7b5cf6] to-[#b060ff] text-[28px] text-white">
                  👤
                </div>
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9d91b4]">
                    Registered
                  </p>
                  <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#2c2646]">
                    조건 맞는 작가 <span className="text-[#8a63ff]">{resultCountLabel}</span>
                  </p>
                  <p className="mt-1 text-[14px] text-[#786f92]">
                    검색 결과 기준으로 바로 확인 가능
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleChecklistClick}
                className="hidden md:flex min-h-[122px] items-center gap-4 rounded-[28px] border border-[#eee3f7] bg-white/95 p-5 text-left shadow-[0_14px_30px_rgba(83,63,125,0.08)]"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#845ef7] to-[#dc68b7] text-[26px] text-white">
                  ✓
                </div>
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9d91b4]">
                    Checklist
                  </p>
                  <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#2c2646]">
                    결혼준비 체크리스트
                  </p>
                  <p className="mt-1 text-[14px] text-[#786f92]">
                    준비 항목을 한 번에 확인할 수 있어요
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleTipsClick}
                className="hidden md:flex min-h-[122px] items-center gap-4 rounded-[28px] border border-[#eee3f7] bg-white/95 p-5 text-left shadow-[0_14px_30px_rgba(83,63,125,0.08)]"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#8a63ff] to-[#f064b7] text-[26px] text-white">
                  ✦
                </div>
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9d91b4]">
                    Tips
                  </p>
                  <p className="mt-1 text-[24px] font-black tracking-[-0.05em] text-[#2c2646]">
                    더 완벽한 결혼식을 위한 꿀팁
                  </p>
                  <p className="mt-1 text-[14px] text-[#786f92]">
                    예산, 촬영 준비, 동선 팁까지 확인
                  </p>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-[104px] lg:self-start">
            <div className="rounded-[24px] border border-[#e8e0f3] bg-[#f7f3fb] p-4 shadow-[0_10px_26px_rgba(80,60,120,0.05)]">
              <div
                onClick={() => setRecentOpen((prev) => !prev)}
                className={`mb-3 flex cursor-pointer items-center justify-between rounded-[16px] px-2 py-2 ${
                  recentOpen ? "bg-[#f1e9ff]" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#6d46f6]">≡</span>
                  <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
                    최근본작가
                  </h3>
                </div>
                <span className="text-[#6f688d]">{recentOpen ? "⌄" : "›"}</span>
              </div>

              {recentOpen && (
                <div className="space-y-3">
                  {recentArtists.length > 0 ? (
                    recentArtists.map((artist) => (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => {
                          saveSearchPageState(window.scrollY);
                          router.push(`/artists/${String(artist.id)}`);
                        }}
                        className="flex w-full items-center gap-3 rounded-[16px] border border-[#ebe3f4] bg-white px-3 py-3 text-left"
                      >
                        <div className="h-11 w-11 overflow-hidden rounded-full bg-[#f1ebf8]">
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#393453]">
                            {artist.name}
                          </p>
                          <p className="truncate text-[11px] text-[#7b7396]">
                            {joinLabel(artist.region)}
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
              )}
            </div>
          </aside>

          <div>
            <div className="mb-4 flex flex-col gap-3 border-b border-[#e7e0f0] pb-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[22px] font-black tracking-[-0.04em] text-[#2a2645]">
                  검색 결과
                </p>
                <p className="mt-2 text-[15px] text-[#6f6886]">{message}</p>
              </div>

              <div ref={favoriteDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setFavoriteOpen((prev) => !prev)}
                  className={`inline-flex h-10 items-center justify-center rounded-[14px] px-4 text-[13px] font-semibold ${
                    favoriteOpen
                      ? "bg-[#6d46f6] text-white"
                      : "bg-[#f1eaff] text-[#6d46f6]"
                  }`}
                >
                  <span className="mr-2">❤</span>
                  찜한 작가 보기 ({favoriteArtists.length})
                  <span className="ml-2">{favoriteOpen ? "⌄" : "›"}</span>
                </button>

                {favoriteOpen && (
                  <div className="absolute right-0 top-[46px] z-30 w-[300px] rounded-[20px] border border-[#e8e1f2] bg-white p-4 shadow-[0_16px_40px_rgba(60,50,100,0.12)]">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-[14px] font-semibold text-[#2b2745]">
                        찜한 작가
                      </h4>
                      <span className="text-[12px] text-[#7a7393]">
                        {favoriteArtists.length}명
                      </span>
                    </div>

                    <div className="space-y-3">
                      {favoriteArtists.length > 0 ? (
                        favoriteArtists.map((artist) => (
                          <div
                            key={artist.id}
                            className="flex items-center gap-3 rounded-[14px] border border-[#efe8f7] bg-[#fcfbfe] px-3 py-3"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                saveSearchPageState(window.scrollY);
                                router.push(`/artists/${String(artist.id)}`);
                              }}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <div className="h-10 w-10 overflow-hidden rounded-full">
                                <img
                                  src={artist.image}
                                  alt={artist.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium text-[#3f3a59]">
                                  {artist.name}
                                </p>
                                <p className="truncate text-[11px] text-[#7a7393]">
                                  {joinLabel(artist.service)}
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={(event) => removeFavorite(event, artist.id)}
                              className="text-[#ff5c9a]"
                              aria-label="찜 해제"
                            >
                              ❤
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-[#e5dcf2] px-4 py-5 text-[12px] text-[#837b9c]">
                          아직 찜한 작가가 없어.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {displayArtists.length > 0 ? (
                displayArtists.map((artist) => {
                  const favorite = isFavorite(String(artist.id));
                  const primaryVideoLink = getPrimaryVideoLink(artist);
                  const renderVideoCard = pureVideoSearch;

                  if (renderVideoCard) {
                    return (
                      <article
                        key={String(artist.id)}
                        onClick={() => goToArtistDetail(artist)}
                        className="group cursor-pointer overflow-hidden rounded-[26px] border border-[#e8dff3] bg-white shadow-[0_8px_24px_rgba(60,50,100,0.06)] transition hover:-translate-y-[4px] hover:shadow-[0_22px_40px_rgba(60,50,100,0.12)]"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-[#f1ebf8]">
                          <img
                            src={artist.video_thumbnail || artist.image}
                            alt={artist.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                          />

                          <div className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                            VIDEO PORTFOLIO
                          </div>

                          <button
                            type="button"
                            onClick={(event) => toggleFavorite(event, artist)}
                            className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm ${
                              favorite
                                ? "border-[#ffbdd4] bg-[#ffedf5] text-[#ff5c9a]"
                                : "border-white/70 bg-white/85 text-[#6a617f]"
                            }`}
                            aria-label={favorite ? "찜 해제" : "찜하기"}
                          >
                            {favorite ? "❤" : "♡"}
                          </button>

                          {primaryVideoLink ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                saveSearchPageState(window.scrollY);
                                saveRecentArtist(artist);
                                window.open(primaryVideoLink, "_blank", "noopener,noreferrer");
                              }}
                              className="absolute bottom-3 right-3 z-10 rounded-full bg-white/90 px-4 py-2 text-[12px] font-bold text-[#4f3ccf] shadow-sm"
                            >
                              영상 보기
                            </button>
                          ) : null}
                        </div>

                        <div className="p-4">
                          <h3 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#272347]">
                            {artist.name}
                          </h3>

                          <p className="mt-1 truncate text-[13px] text-[#6a6384]">
                            {joinLabel(artist.region)}
                          </p>

                          <p className="mt-1 truncate text-[13px] text-[#8d63ff]">
                            {joinLabel(artist.service)}
                          </p>

                          <p className="mt-3 text-[14px] font-semibold text-[#4b4468]">
                            {artist.price}
                          </p>

                          <div className="mt-3 text-[13px] text-[#6d6786]">
                            <span className="font-semibold text-[#f3a51c]">
                              ★ {artist.rating?.toFixed(1)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {artist.keywords?.slice(0, 4).map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-[#f2ebff] px-2.5 py-1 text-[11px] font-medium text-[#7652ea]"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                goToArtistDetail(artist);
                              }}
                              className="h-10 rounded-[14px] bg-[#f3effb] text-[13px] font-semibold text-[#5b47c8]"
                            >
                              상세페이지
                            </button>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!primaryVideoLink) return;
                                saveSearchPageState(window.scrollY);
                                saveRecentArtist(artist);
                                window.open(primaryVideoLink, "_blank", "noopener,noreferrer");
                              }}
                              disabled={!primaryVideoLink}
                              className={`h-10 rounded-[14px] text-[13px] font-semibold ${
                                primaryVideoLink
                                  ? "bg-[#6d46f6] text-white"
                                  : "bg-[#ece8f6] text-[#9a93b1]"
                              }`}
                            >
                              {primaryVideoLink ? "영상 포트폴리오" : "준비중"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article
                      key={String(artist.id)}
                      onClick={() => goToArtistDetail(artist)}
                      className="group cursor-pointer overflow-hidden rounded-[26px] border border-[#e8dff3] bg-white shadow-[0_8px_24px_rgba(60,50,100,0.06)] transition hover:-translate-y-[4px] hover:shadow-[0_22px_40px_rgba(60,50,100,0.12)]"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#f1ebf8]">
                        <img
                          src={artist.image}
                          alt={artist.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                        />

                        <button
                          type="button"
                          onClick={(event) => toggleFavorite(event, artist)}
                          className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm ${
                            favorite
                              ? "border-[#ffbdd4] bg-[#ffedf5] text-[#ff5c9a]"
                              : "border-white/70 bg-white/85 text-[#6a617f]"
                          }`}
                          aria-label={favorite ? "찜 해제" : "찜하기"}
                        >
                          {favorite ? "❤" : "♡"}
                        </button>
                      </div>

                      <div className="p-4">
                        <h3 className="truncate text-[19px] font-bold tracking-[-0.03em] text-[#272347]">
                          {artist.name}
                        </h3>

                        <p className="mt-1 truncate text-[13px] text-[#6a6384]">
                          {joinLabel(artist.region)}
                        </p>

                        <p className="mt-1 truncate text-[13px] text-[#8d63ff]">
                          {joinLabel(artist.service)}
                        </p>

                        <p className="mt-3 text-[14px] font-semibold text-[#4b4468]">
                          {artist.price}
                        </p>

                        <div className="mt-3 text-[13px] text-[#6d6786]">
                          <span className="font-semibold text-[#f3a51c]">
                            ★ {artist.rating?.toFixed(1)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {artist.keywords?.slice(0, 4).map((keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full bg-[#f2ebff] px-2.5 py-1 text-[11px] font-medium text-[#7652ea]"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              goToArtistDetail(artist);
                            }}
                            className="h-10 rounded-[14px] bg-[#f3effb] text-[13px] font-semibold text-[#5b47c8]"
                          >
                            상세페이지
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!artist.portfolio) return;
                              saveSearchPageState(window.scrollY);
                              saveRecentArtist(artist);
                              window.open(
                                artist.portfolio,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                            disabled={!artist.portfolio}
                            className={`h-10 rounded-[14px] text-[13px] font-semibold ${
                              artist.portfolio
                                ? "bg-[#6d46f6] text-white"
                                : "bg-[#ece8f6] text-[#9a93b1]"
                            }`}
                          >
                            {artist.portfolio ? "포트폴리오" : "준비중"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="col-span-full rounded-[24px] border border-[#e6dff0] bg-white p-10 text-center text-[17px] text-[#756f8d]">
                  {date ? "아직 표시할 검색 결과가 없어." : "먼저 예식 날짜를 입력해줘."}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}