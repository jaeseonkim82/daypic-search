"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";

const ADMIN_INQUIRY_URL = "https://pf.kakao.com/_YOUR_CHANNEL_LINK";

const headerButtonClass =
  "inline-flex h-[44px] min-w-[116px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-colors duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white";

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

type FormState = {
  companyName: string;
  email: string;
  phone: string;
  services: string[];
  regions: string[];
  price: string;
  styleKeywords: string[];
  portfolioUrl: string;
  openchatUrl: string;
};

const initialFormState: FormState = {
  companyName: "",
  email: "",
  phone: "",
  services: [],
  regions: [],
  price: "",
  styleKeywords: [],
  portfolioUrl: "",
  openchatUrl: "",
};

function MultiSelectDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const toggleValue = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
      return;
    }
    onChange([...value, option]);
  };

  const selectedText =
    value.length > 0 ? value.join(", ") : placeholder;

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
              className="inline-flex h-[40px] items-center justify-center rounded-full border border-[#dccccf2] px-4 text-sm font-semibold text-[#5d4f8a]"
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

export default function ArtistRegisterPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const isFormValid = useMemo(() => {
    return (
      form.companyName.trim() &&
      form.email.trim() &&
      form.phone.trim() &&
      form.services.length > 0 &&
      form.regions.length > 0 &&
      form.price.trim() &&
      form.styleKeywords.length > 0 &&
      form.portfolioUrl.trim() &&
      form.openchatUrl.trim()
    );
  }, [form]);

  const updateField = (
    key: keyof FormState,
    value: FormState[keyof FormState]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage("");
    setSubmitError("");

    if (!isFormValid) {
      setSubmitError("필수 항목을 모두 입력해 주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/artists/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "등록 중 문제가 발생했습니다.");
      }

      setSubmitMessage("작가 정보가 정상적으로 등록되었습니다.");
      setForm(initialFormState);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "작가 정보 등록 중 오류가 발생했습니다.";

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf7fc] text-[#251f3c]">
      

      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <section className="relative overflow-hidden rounded-[38px] border border-[#eee5f7] bg-[radial-gradient(circle_at_top_left,_rgba(164,133,255,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,170,214,0.18),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#fcf9ff_52%,_#f8f3fb_100%)] p-6 shadow-[0_18px_50px_rgba(95,71,147,0.08)] md:p-8 xl:p-10">
          <div className="mb-8">
            <div className="inline-flex rounded-full border border-[#eadff8] bg-white/85 px-4 py-2 text-[12px] font-semibold text-[#7a5cf6] shadow-sm">
              DAYPIC ARTIST
            </div>

            <h1 className="mt-5 text-[34px] font-black leading-[1.16] tracking-[-0.06em] text-[#2a2444] md:text-[52px]">
              작가 정보 등록
            </h1>

            <p className="mt-5 max-w-[760px] text-[16px] leading-8 text-[#6f6888]">
              데이픽에 노출될 작가님의 기본 정보를 입력해 주세요.
              <br />
              입력하신 정보는 작가 연결과 검색 노출에 활용됩니다.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-[#e9e0f5] bg-white/92 p-6 shadow-[0_12px_28px_rgba(84,62,133,0.07)] md:p-8"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                  업체명 <span className="text-violet-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  placeholder="업체명 또는 활동명을 입력해 주세요."
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                  이메일 <span className="text-violet-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="연락 가능한 이메일을 입력해 주세요."
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500"
                />
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
                  촬영서비스 <span className="text-violet-500">*</span>
                </label>
                <MultiSelectDropdown
                  label="촬영서비스"
                  placeholder="촬영서비스를 선택해 주세요."
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
                  label="촬영지역"
                  placeholder="촬영지역을 선택해 주세요."
                  options={REGION_OPTIONS}
                  value={form.regions}
                  onChange={(next) => updateField("regions", next)}
                />
              </div>

              <div>
                <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                  촬영비용 <span className="text-violet-500">*</span>
                </label>
                <SingleSelectDropdown
                  placeholder="촬영비용을 선택해 주세요."
                  options={PRICE_OPTIONS}
                  value={form.price}
                  onChange={(next) => updateField("price", next)}
                />
              </div>

              <div className="md:col-span-1">
                <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                  성향키워드 <span className="text-violet-500">*</span>
                </label>
                <MultiSelectDropdown
                  label="성향키워드"
                  placeholder="성향키워드를 선택해 주세요."
                  options={STYLE_OPTIONS}
                  value={form.styleKeywords}
                  onChange={(next) => updateField("styleKeywords", next)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                  포트폴리오 <span className="text-violet-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.portfolioUrl}
                  onChange={(e) => updateField("portfolioUrl", e.target.value)}
                  placeholder="포트폴리오 URL을 입력해 주세요."
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-3 block text-[17px] font-bold text-[#4a3c7d]">
                  오픈채팅 링크 <span className="text-violet-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.openchatUrl}
                  onChange={(e) => updateField("openchatUrl", e.target.value)}
                  placeholder="카카오 오픈채팅 링크를 입력해 주세요."
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500"
                />
              </div>
            </div>

            {(submitError || submitMessage) && (
              <div
                className={`mt-8 rounded-2xl px-4 py-4 text-sm font-medium ${
                  submitError
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {submitError || submitMessage}
              </div>
            )}

            <div className="mt-10 space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#5b45f4] to-[#6b53ff] text-lg font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "등록 중입니다..." : "등록하기"}
              </button>

              <Link
                href="/artist-dashboard"
                className="flex h-14 w-full items-center justify-center rounded-2xl border border-[#d9d0f3] bg-white text-base font-bold text-[#4a3c7d] transition hover:bg-[#f7f4ff]"
              >
                작가 대시보드로 돌아가기
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}