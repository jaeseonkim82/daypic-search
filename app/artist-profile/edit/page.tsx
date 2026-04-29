"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import DbErrorBanner from "@/app/components/DbErrorBanner";

const SERVICE_OPTIONS = [
  "본식스냅",
  "영상촬영",
  "서브스냅",
  "아이폰스냅",
  "돌스냅",
  "야외스냅",
  "애견스냅",
  "스튜디오",
];

const REGION_OPTIONS = [
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
  "제주도",
];

const PRICE_OPTIONS = [
  "10~50만원",
  "50~100만원",
  "100~150만원",
  "150~200만원",
];

const STYLE_OPTIONS = [
  "밝은 에너지",
  "차분한 분위기",
  "섬세한 디렉팅",
  "감정 포착",
  "감성적인 연출",
  "스토리 있는 촬영",
  "감성적인 색감",
  "자연광 스타일",
  "영화 같은 연출",
  "밝고 화사한 톤",
  "따뜻한 색감",
  "세련된 스타일",
  "미니멀한 구도",
  "디테일 구도",
  "클래식한 분위기",
  "트렌디한 스타일",
  "친절한",
  "소통이 좋은",
  "진행이 매끄러운",
  "시간 약속 철저",
  "꼼꼼한",
  "책임감 있는",
  "경험 많은",
  "안정적인 진행",
  "빠른 피드백",
  "배려 깊은",
  "편안한 분위기",
  "자연스러운 촬영",
  "유쾌한 진행",
  "긴장 풀어주는",
];

type MeArtistResponse = {
  ok: boolean;
  dbError?: boolean;
  error?: string;
  artist?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    price: string;
    service: string[] | string;
    region: string[] | string;
    style_keywords: string[] | string;
    updated_at: string | null;
  };
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  price: string;
  services: string[];
  regions: string[];
  styleKeywords: string[];
};

function toArray(value: string[] | string | undefined) {
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

function ReadOnlyBox({ value }: { value: string }) {
  return (
    <div className="w-full rounded-[18px] border border-[#ece7ff] bg-[#f5f2ff] px-4 py-3 text-[15px] text-[#6e6790]">
      {value}
    </div>
  );
}

function MultiSelectDropdown({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleValue = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }

    onChange([...value, option]);
  };

  const selectedText = value.length > 0 ? value.join(", ") : placeholder;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 py-4 text-left text-base text-[#32285d] transition focus:border-violet-500"
      >
        <span className={value.length ? "text-[#32285d]" : "text-[#9a91b8]"}>
          {selectedText}
        </span>
        <span className="ml-4 shrink-0 text-[#7a6ca8]">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-[#e7e1f5] bg-white p-2 shadow-[0_18px_35px_rgba(76,58,124,0.14)]">
          {options.map((option) => {
            const checked = value.includes(option);

            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#3c315f] transition hover:bg-[#f7f3ff]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleValue(option)}
                  className="h-4 w-4 accent-[#6d56f6]"
                />
                <span>{option}</span>
              </label>
            );
          })}

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-[40px] items-center justify-center rounded-full border border-[#dccff2] px-4 text-sm font-semibold text-[#5d4f8a]"
            >
              선택 완료
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SingleSelectDropdown({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500"
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function ArtistProfileEditPage() {
  const [artistId, setArtistId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [dbError, setDbError] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    price: "",
    services: [],
    regions: [],
    styleKeywords: [],
  });

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        setError("");
        setMessage("");

        const res = await fetch("/api/me/artist", {
          credentials: "include",
          cache: "no-store",
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (res.status === 403) {
          window.location.href = "/artist-register";
          return;
        }

        const data: MeArtistResponse = await res.json();

        if (!res.ok || !data.artist) {
          throw new Error(data.error ?? "작가 정보를 불러오지 못했어.");
        }

        if (!ignore) {
          setDbError(data.dbError === true);
          setArtistId(data.artist.id);
          setForm({
            name: data.artist.name,
            email: data.artist.email,
            phone: data.artist.phone,
            price: data.artist.price,
            services: toArray(data.artist.service),
            regions: toArray(data.artist.region),
            styleKeywords: toArray(data.artist.style_keywords),
          });
          setExpectedUpdatedAt(data.artist.updated_at);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "작가 정보를 불러오는 중 오류가 발생했어."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  const isValid = useMemo(() => {
    return (
      !!form.phone.trim() &&
      !!form.price.trim() &&
      form.services.length > 0 &&
      form.regions.length > 0 &&
      form.styleKeywords.length > 0
    );
  }, [form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!artistId || saving) return;

    if (!isValid) {
      setError("연락처, 가격대, 촬영서비스, 촬영지역, 촬영스타일을 모두 입력해줘.");
      setMessage("");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload: Record<string, unknown> = {
        phone: form.phone.trim(),
        price: form.price.trim(),
        service: form.services,
        region: form.regions,
        style_keywords: form.styleKeywords,
      };
      if (expectedUpdatedAt) {
        payload.expected_updated_at = expectedUpdatedAt;
      }

      const res = await fetch(`/api/artists/${artistId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        // 다른 기기에서 저장되어 경합 발생 — 최신값 반영
        if (typeof data?.current_updated_at === "string") {
          setExpectedUpdatedAt(data.current_updated_at);
        }
        throw new Error(
          data?.error ||
            "다른 기기에서 먼저 저장되어, 새로고침 후 다시 시도해줘."
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "작가정보 저장에 실패했어.");
      }

      if (data?.artist?.updated_at) {
        setExpectedUpdatedAt(data.artist.updated_at);
      }
      setMessage("작가정보가 저장되었어.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "작가정보 저장 중 오류가 발생했어."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fcfbff] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#ece7ff] bg-white p-8 shadow-sm">
          <p className="text-sm text-[#7b728f]">작가정보 불러오는 중...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfbff] px-6 py-10 md:py-16">
      <div className="mx-auto max-w-4xl">
        <DbErrorBanner
          show={dbError}
          message="데이터 서버 연결이 일시적으로 불안정해. 저장은 잠시 후 다시 시도해줘."
        />

        <section className="rounded-[30px] border border-[#ece7ff] bg-white p-8 shadow-sm md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.08em] text-[#8a7eb0]">
                DAYPIC ARTIST PROFILE
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#2b2341] md:text-4xl">
                작가정보 수정
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-[#6f6888]">
                연락처, 가격대, 촬영서비스, 촬영지역, 촬영스타일을 수정할 수 있어.
              </p>
            </div>

            <Link
              href="/mypage"
              className="inline-flex w-fit items-center justify-center rounded-full border border-[#d8ceff] bg-[#faf8ff] px-5 py-3 text-sm font-semibold text-[#6f5bd3] transition hover:bg-[#f4efff]"
            >
              마이페이지로 돌아가기
            </Link>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-[30px] border border-[#ece7ff] bg-white p-6 shadow-sm md:p-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                이름
              </div>
              <ReadOnlyBox value={form.name || "작가 이름"} />
            </div>

            <div>
              <div className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                이메일
              </div>
              <ReadOnlyBox value={form.email || "이메일 주소"} />
            </div>

            <div>
              <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                연락처 <span className="text-violet-500">*</span>
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="예: 010-1234-5678"
                className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500"
              />
            </div>

            <div>
              <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                촬영비용 <span className="text-violet-500">*</span>
              </label>
              <SingleSelectDropdown
                placeholder="촬영비용을 선택해줘."
                options={PRICE_OPTIONS}
                value={form.price}
                onChange={(next) => updateField("price", next)}
              />
            </div>

            <div>
              <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                촬영서비스 <span className="text-violet-500">*</span>
              </label>
              <MultiSelectDropdown
                placeholder="촬영서비스를 선택해줘."
                options={SERVICE_OPTIONS}
                value={form.services}
                onChange={(next) => updateField("services", next)}
              />
            </div>

            <div>
              <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                촬영지역 <span className="text-violet-500">*</span>
              </label>
              <MultiSelectDropdown
                placeholder="촬영지역을 선택해줘."
                options={REGION_OPTIONS}
                value={form.regions}
                onChange={(next) => updateField("regions", next)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                촬영스타일 <span className="text-violet-500">*</span>
              </label>
              <MultiSelectDropdown
                placeholder="촬영스타일을 선택해줘."
                options={STYLE_OPTIONS}
                value={form.styleKeywords}
                onChange={(next) => updateField("styleKeywords", next)}
              />
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl bg-[#fff3f3] px-4 py-3 text-sm font-medium text-[#b03c3c]">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-6 rounded-2xl bg-[#eefaf1] px-4 py-3 text-sm font-medium text-[#237247]">
              {message}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || dbError}
              className="inline-flex items-center justify-center rounded-full bg-[#7a5cf6] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "저장 중..." : dbError ? "서버 연결 대기 중" : "저장하기"}
            </button>

            <Link
              href="/mypage"
              className="inline-flex items-center justify-center rounded-full border border-[#ddd5ff] bg-white px-6 py-3 text-sm font-semibold text-[#5d5383] transition hover:bg-[#f7f4ff]"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}