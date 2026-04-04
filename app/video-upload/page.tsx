"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type ArtistLookupResponse = {
  success?: boolean;
  artist?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
};

type AirtableAttachment = {
  id?: string;
  url?: string;
  filename?: string;
};

type ArtistDetailResponse = {
  id: string;
  email: string;
  name: string;
  video_link_1?: string;
  video_link_2?: string;
  video_link_3?: string;
  video_link_4?: string;
  video_thumbnail?: AirtableAttachment[] | string;
  video_style_tags?: string[] | string;
};

type VideoPortfolioSaveResponse = {
  success?: boolean;
  error?: string;
};

type CloudinarySignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  error?: string;
};

const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;
const ADMIN_INQUIRY_URL = "https://pf.kakao.com/_YOUR_CHANNEL_LINK";

const headerButtonClass =
  "inline-flex h-[44px] min-w-[116px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-colors duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white";

function normalizeTagArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeThumbnailUrl(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const first = value[0];
    if (
      first &&
      typeof first === "object" &&
      "url" in first &&
      typeof first.url === "string"
    ) {
      return first.url.trim();
    }
  }

  return "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function VideoUploadPageInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [artistId, setArtistId] = useState("");
  const [artistName, setArtistName] = useState("");

  const [videoLink1, setVideoLink1] = useState("");
  const [videoLink2, setVideoLink2] = useState("");
  const [videoLink3, setVideoLink3] = useState("");
  const [videoLink4, setVideoLink4] = useState("");
  const [videoStyleTags, setVideoStyleTags] = useState("");

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isFindingArtist, setIsFindingArtist] = useState(false);
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  const thumbnailPreviewUrl = useMemo(() => {
    if (!thumbnailFile) return "";
    return URL.createObjectURL(thumbnailFile);
  }, [thumbnailFile]);

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
    };
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    if (!email) {
      setError("이메일 정보가 없어 올바른 링크로 다시 접속해 주세요.");
      return;
    }

    const findArtist = async () => {
      try {
        setIsFindingArtist(true);
        setError("");
        setMessage("");

        const res = await fetch(
          `/api/artists/by-email?email=${encodeURIComponent(email)}`
        );
        const data: ArtistLookupResponse = await res.json();

        if (!res.ok || !data.artist) {
          throw new Error(data.error || "작가 정보를 찾지 못했습니다.");
        }

        setArtistId(data.artist.id);
        setArtistName(data.artist.name);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "작가 정보를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setIsFindingArtist(false);
      }
    };

    findArtist();
  }, [email]);

  useEffect(() => {
    if (!artistId) return;

    const loadExistingData = async () => {
      try {
        setIsLoadingExistingData(true);
        setError("");

        const res = await fetch(`/api/artists/${artistId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data: ArtistDetailResponse = await res.json();

        if (!res.ok) {
          throw new Error("기존 영상 포트폴리오 정보를 불러오지 못했습니다.");
        }

        setVideoLink1(data.video_link_1 || "");
        setVideoLink2(data.video_link_2 || "");
        setVideoLink3(data.video_link_3 || "");
        setVideoLink4(data.video_link_4 || "");
        setExistingThumbnailUrl(normalizeThumbnailUrl(data.video_thumbnail));
        setVideoStyleTags(normalizeTagArray(data.video_style_tags).join(", "));
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "기존 영상 포트폴리오 정보를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoadingExistingData(false);
      }
    };

    loadExistingData();
  }, [artistId]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setThumbnailFile(null);
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setError(
        `썸네일 이미지 용량이 너무 큽니다. 최대 10MB까지 가능합니다. (${file.name}: ${formatBytes(
          file.size
        )})`
      );
      setThumbnailFile(null);
      return;
    }

    setError("");
    setMessage("");
    setThumbnailFile(file);
  };

  const uploadThumbnailToCloudinary = async (file: File) => {
    const signRes = await fetch("/api/cloudinary/sign", {
      method: "POST",
    });

    const signData: CloudinarySignResponse = await signRes.json();

    if (!signRes.ok) {
      throw new Error(signData?.error || "Cloudinary 서명 요청에 실패했습니다.");
    }

    const { cloudName, apiKey, timestamp, folder, signature } = signData;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", folder);
    formData.append("signature", signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(
        uploadData?.error?.message || "Cloudinary 썸네일 업로드에 실패했습니다."
      );
    }

    return uploadData.secure_url as string;
  };

  const handleSave = async () => {
    if (!email) {
      setError("이메일 정보가 없습니다.");
      return;
    }

    if (!artistId) {
      setError("작가 정보를 아직 찾지 못했습니다.");
      return;
    }

    const hasAtLeastOneVideo =
      videoLink1.trim() ||
      videoLink2.trim() ||
      videoLink3.trim() ||
      videoLink4.trim();

    if (!hasAtLeastOneVideo) {
      setError("영상 링크를 최소 1개 이상 입력해 주세요.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("저장을 준비하고 있습니다...");

      let thumbnailUrl = existingThumbnailUrl;

      if (thumbnailFile) {
        setMessage("썸네일을 업로드하고 있습니다...");
        thumbnailUrl = await uploadThumbnailToCloudinary(thumbnailFile);
      }

      setMessage("영상 포트폴리오를 저장하고 있습니다...");

      const res = await fetch(`/api/artists/${artistId}/video-portfolio`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_link_1: videoLink1.trim(),
          video_link_2: videoLink2.trim(),
          video_link_3: videoLink3.trim(),
          video_link_4: videoLink4.trim(),
          video_thumbnail: thumbnailUrl,
          video_style_tags: videoStyleTags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data: VideoPortfolioSaveResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "영상 포트폴리오 저장에 실패했습니다.");
      }

      setExistingThumbnailUrl(thumbnailUrl);
      setThumbnailFile(null);
      setMessage("영상 포트폴리오 저장이 완료되었습니다.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "영상 포트폴리오 저장 중 오류가 발생했습니다."
      );
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isFindingArtist || isLoadingExistingData || isSaving;

  return (
    <main className="min-h-screen bg-[#faf7fc] text-[#251f3c]">


      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-8 md:px-8 md:pt-10">
        <section className="overflow-hidden rounded-[38px] border border-[#ece3f6] bg-[radial-gradient(circle_at_top_left,_rgba(144,110,255,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(244,170,214,0.12),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#fcf9ff_52%,_#f8f3fb_100%)] p-6 shadow-[0_18px_40px_rgba(78,58,130,0.08)] md:p-8 xl:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex rounded-full border border-[#e7dbf7] bg-white px-4 py-2 text-[12px] font-semibold text-[#7a5cf6]">
                DAYPIC VIDEO GALLERY
              </div>

              <h1 className="mt-5 text-[34px] font-black leading-[1.16] tracking-[-0.06em] text-[#2a2444] md:text-[52px]">
                영상 포트폴리오를
                <br />
                더 선명하게 보여주세요
              </h1>

              <p className="mt-5 max-w-[760px] text-[16px] leading-8 text-[#6f6888]">
                영상 링크와 대표 썸네일은 고객이 작가님의 촬영 스타일과 분위기를
                빠르게 이해하는 데 중요한 기준이 됩니다. 정리된 영상 포트폴리오는
                문의 연결에도 도움이 됩니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex rounded-full bg-[#f2ebff] px-4 py-2 text-[13px] font-semibold text-[#6d46f6]">
                  영상 링크 최대 4개
                </div>
                <div className="inline-flex rounded-full bg-[#f8eef8] px-4 py-2 text-[13px] font-semibold text-[#c0569f]">
                  대표 썸네일 설정 가능
                </div>
                <div className="inline-flex rounded-full bg-[#edf5ff] px-4 py-2 text-[13px] font-semibold text-[#4a73d6]">
                  스타일 태그 저장 가능
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#eadff7] bg-white/88 p-6 shadow-[0_12px_28px_rgba(84,62,133,0.07)]">
              <div className="text-[12px] font-bold tracking-[0.14em] text-[#9b8dbf]">
                ARTIST STATUS
              </div>

              <h2 className="mt-3 text-[28px] font-black leading-[1.25] tracking-[-0.05em] text-[#2b2745]">
                현재 등록 상태를
                <br />
                확인해 주세요
              </h2>

              <div className="mt-5 space-y-3 text-[15px] leading-7 text-[#6e6786]">
                <div className="rounded-[18px] bg-[#f7f3ff] px-4 py-4">
                  <span className="font-bold text-[#4f3ccf]">작가명</span>
                  <div className="mt-1 text-[#2d2748]">
                    {isFindingArtist
                      ? "작가 정보를 확인하고 있습니다..."
                      : artistName || "작가 정보를 찾지 못했습니다."}
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#fcf4f8] px-4 py-4">
                  <span className="font-bold text-[#b95d98]">등록된 영상 링크</span>
                  <div className="mt-1 text-[#2d2748]">
                    {
                      [videoLink1, videoLink2, videoLink3, videoLink4].filter(
                        (item) => item.trim()
                      ).length
                    }
                    개 입력됨
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#eef5ff] px-4 py-4">
                  <span className="font-bold text-[#5b7fda]">대표 썸네일</span>
                  <div className="mt-1 text-[#2d2748]">
                    {existingThumbnailUrl || thumbnailPreviewUrl
                      ? "대표 썸네일이 설정되어 있습니다."
                      : "대표 썸네일이 아직 설정되지 않았습니다."}
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#f4ecff] px-4 py-4">
                  <span className="font-bold text-[#6846d7]">스타일 태그</span>
                  <div className="mt-1 text-[#2d2748]">
                    {videoStyleTags.trim()
                      ? "영상 스타일 태그가 입력되어 있습니다."
                      : "영상 스타일 태그가 아직 입력되지 않았습니다."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {(message || error) && (
          <section className="mt-6">
            <div
              className={`rounded-[22px] border px-5 py-4 text-[15px] font-medium ${
                error
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)] md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#2b2745]">
                  영상 링크 등록
                </h2>
                <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
                  유튜브, 인스타 릴스, 비메오 등 고객에게 보여줄 영상 링크를
                  등록해 주세요.
                </p>
              </div>
            </div>

            {isLoadingExistingData ? (
              <p className="mt-6 text-[15px] text-[#6f6888]">
                기존 영상 포트폴리오 정보를 불러오고 있습니다...
              </p>
            ) : null}

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 1
                </label>
                <input
                  type="text"
                  value={videoLink1}
                  onChange={(e) => setVideoLink1(e.target.value)}
                  placeholder="https://youtube.com/... 또는 https://www.instagram.com/reel/..."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 2
                </label>
                <input
                  type="text"
                  value={videoLink2}
                  onChange={(e) => setVideoLink2(e.target.value)}
                  placeholder="추가 영상 링크를 입력해 주세요."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 3
                </label>
                <input
                  type="text"
                  value={videoLink3}
                  onChange={(e) => setVideoLink3(e.target.value)}
                  placeholder="추가 영상 링크를 입력해 주세요."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 4
                </label>
                <input
                  type="text"
                  value={videoLink4}
                  onChange={(e) => setVideoLink4(e.target.value)}
                  placeholder="추가 영상 링크를 입력해 주세요."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 스타일 태그
                </label>
                <input
                  type="text"
                  value={videoStyleTags}
                  onChange={(e) => setVideoStyleTags(e.target.value)}
                  placeholder="예: 감성적 연출, 다큐 스타일, 시네마틱"
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
                <p className="mt-2 text-[13px] text-[#9a91b8]">
                  여러 개 입력할 경우 쉼표(,)로 구분해 주세요.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)] md:p-8">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#2b2745]">
              대표 썸네일 등록
            </h2>
            <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
              고객에게 먼저 보여질 대표 썸네일을 등록하거나 변경해 주세요.
            </p>

            {existingThumbnailUrl ? (
              <div className="mt-5">
                <p className="mb-3 text-[14px] font-medium text-[#6e6786]">
                  현재 저장된 대표 썸네일
                </p>
                <img
                  src={existingThumbnailUrl}
                  alt="existing-thumbnail"
                  className="h-auto w-full max-w-[360px] rounded-[18px] border border-[#ebe4f5] object-cover"
                />
              </div>
            ) : null}

            <div className="mt-5 rounded-[20px] bg-[#faf7ff] p-5">
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                disabled={isBusy}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={isBusy}
                className={`inline-flex h-[48px] min-w-[180px] items-center justify-center rounded-[16px] px-5 text-[15px] font-bold text-white transition ${
                  isBusy
                    ? "cursor-not-allowed bg-[#c4b7f1]"
                    : "bg-[#6948f5] hover:bg-[#5636df]"
                }`}
              >
                {existingThumbnailUrl ? "썸네일 변경하기" : "썸네일 선택하기"}
              </button>

              <p className="mt-4 text-[14px] text-[#6f6888]">
                {thumbnailFile
                  ? `선택된 파일: ${thumbnailFile.name}`
                  : "아직 선택된 새 썸네일이 없습니다."}
              </p>

              <p className="mt-2 text-[13px] text-[#9a91b8]">
                JPG, PNG 등 이미지 파일 / 최대 10MB
              </p>
            </div>

            {thumbnailPreviewUrl ? (
              <div className="mt-6">
                <p className="mb-3 text-[14px] font-medium text-[#6e6786]">
                  새 썸네일 미리보기
                </p>
                <img
                  src={thumbnailPreviewUrl}
                  alt="thumbnail-preview"
                  className="h-auto w-full max-w-[360px] rounded-[18px] border border-[#ebe4f5] object-cover"
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy}
              className={`mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-[18px] text-[16px] font-bold text-white transition ${
                isBusy
                  ? "cursor-not-allowed bg-[#c4b7f1]"
                  : "bg-gradient-to-r from-[#6b56f5] to-[#d35fae] hover:opacity-95"
              }`}
            >
              {isSaving ? "저장 중입니다..." : "영상 포트폴리오 저장"}
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)]">
          <h3 className="text-[20px] font-black tracking-[-0.04em] text-[#2b2745]">
            등록 전에 확인해 주세요
          </h3>
          <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
            영상 포트폴리오는 작가님의 촬영 리듬과 분위기를 가장 빠르게 전달하는 자료입니다.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">첫 링크가 중요합니다</span>
              가장 먼저 보일 영상은 작가님의 스타일을 잘 보여주는 대표 영상으로 선택해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">썸네일 통일감</span>
              대표 썸네일은 작가님의 전체 영상 분위기와 잘 맞는 컷으로 선택해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">링크 품질 확인</span>
              고객이 바로 볼 수 있도록 공개 링크가 정상 작동하는지 꼭 확인해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">스타일 전달력</span>
              태그를 함께 정리해 두면 고객이 원하는 분위기와의 적합도를 더 빠르게 판단할 수 있습니다.
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center">
            <Link
              href="/artist-dashboard"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white"
            >
              대시보드 돌아가기
            </Link>
            <Link
              href="/artist-calendar"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white"
            >
              일정 관리
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function VideoUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#faf7fc] text-[18px] text-[#4a3c7d]">
          로딩 중입니다...
        </div>
      }
    >
      <VideoUploadPageInner />
    </Suspense>
  );
}