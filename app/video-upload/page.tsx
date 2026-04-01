"use client";

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
      setError("이메일 정보가 없어. 올바른 링크로 다시 접속해줘.");
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
          throw new Error(data.error || "작가 정보를 찾지 못했어.");
        }

        setArtistId(data.artist.id);
        setArtistName(data.artist.name);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "작가 정보를 불러오는 중 오류가 발생했어."
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
          throw new Error("기존 영상 포트폴리오 정보를 불러오지 못했어.");
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
            : "기존 영상 포트폴리오 정보를 불러오는 중 오류가 발생했어."
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
        `썸네일 이미지 용량이 너무 커. 최대 10MB까지 가능해. (${file.name}: ${formatBytes(
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
      throw new Error(signData?.error || "Cloudinary 서명 요청에 실패했어.");
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
        uploadData?.error?.message || "Cloudinary 썸네일 업로드에 실패했어."
      );
    }

    return uploadData.secure_url as string;
  };

  const handleSave = async () => {
    if (!email) {
      setError("이메일 정보가 없어.");
      return;
    }

    if (!artistId) {
      setError("작가 정보를 아직 찾지 못했어.");
      return;
    }

    const hasAtLeastOneVideo =
      videoLink1.trim() ||
      videoLink2.trim() ||
      videoLink3.trim() ||
      videoLink4.trim();

    if (!hasAtLeastOneVideo) {
      setError("영상 링크를 최소 1개 이상 입력해줘.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("저장 준비 중이야...");

      let thumbnailUrl = existingThumbnailUrl;

      if (thumbnailFile) {
        setMessage("썸네일 업로드 중이야...");
        thumbnailUrl = await uploadThumbnailToCloudinary(thumbnailFile);
      }

      setMessage("영상 포트폴리오 저장 중이야...");

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
        throw new Error(data.error || "영상 포트폴리오 저장에 실패했어.");
      }

      setExistingThumbnailUrl(thumbnailUrl);
      setThumbnailFile(null);
      setMessage("영상 포트폴리오 저장 완료!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "영상 포트폴리오 저장 중 오류가 발생했어."
      );
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isFindingArtist || isLoadingExistingData || isSaving;

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "80px 20px",
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: "bold" }}>
        작가 영상 포트폴리오 등록 / 관리
      </h1>

      <p style={{ marginTop: "10px", opacity: 0.75 }}>
        유튜브, 인스타 릴스, 비메오 링크를 등록할 수 있어
      </p>

      <div style={{ marginTop: "20px", opacity: 0.7, textAlign: "center" }}>
        <div>현재 계정: {email || "이메일 없음"}</div>
        <div style={{ marginTop: "8px" }}>
          {isFindingArtist
            ? "작가 정보를 찾는 중..."
            : artistName
            ? `작가명: ${artistName}`
            : "작가명: 찾지 못함"}
        </div>
      </div>

      <div
        style={{
          marginTop: "35px",
          background: "#111",
          padding: "30px",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "980px",
          border: "1px solid #222",
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: 700 }}>영상 링크 등록</h2>

        <p style={{ marginTop: "10px", fontSize: "14px", opacity: 0.7 }}>
          영상촬영 검색에서는 여기에 저장된 영상 포트폴리오가 보여지게 될 거야
        </p>

        {isLoadingExistingData ? (
          <p style={{ marginTop: "18px", opacity: 0.7 }}>
            기존 영상 포트폴리오를 불러오는 중...
          </p>
        ) : null}

        <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
              영상 링크 1
            </label>
            <input
              type="text"
              value={videoLink1}
              onChange={(e) => setVideoLink1(e.target.value)}
              placeholder="https://youtube.com/... 또는 https://www.instagram.com/reel/..."
              disabled={isBusy}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
              영상 링크 2
            </label>
            <input
              type="text"
              value={videoLink2}
              onChange={(e) => setVideoLink2(e.target.value)}
              placeholder="추가 영상 링크"
              disabled={isBusy}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
              영상 링크 3
            </label>
            <input
              type="text"
              value={videoLink3}
              onChange={(e) => setVideoLink3(e.target.value)}
              placeholder="추가 영상 링크"
              disabled={isBusy}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 700 }}>
              영상 링크 4
            </label>
            <input
              type="text"
              value={videoLink4}
              onChange={(e) => setVideoLink4(e.target.value)}
              placeholder="추가 영상 링크"
              disabled={isBusy}
              style={inputStyle}
            />
          </div>

                </div>

        <hr
          style={{
            margin: "32px 0",
            border: "none",
            borderTop: "1px solid #2b2b2b",
          }}
        />

        <h2 style={{ fontSize: "22px", fontWeight: 700 }}>대표 썸네일 업로드</h2>

        {existingThumbnailUrl ? (
          <div style={{ marginTop: "18px" }}>
            <p style={{ marginBottom: "10px", fontSize: "14px", opacity: 0.7 }}>
              현재 저장된 대표 썸네일
            </p>
            <img
              src={existingThumbnailUrl}
              alt="existing-thumbnail"
              style={{
                width: "100%",
                maxWidth: "320px",
                borderRadius: "12px",
                border: "1px solid #333",
                display: "block",
              }}
            />
          </div>
        ) : null}

        <div style={{ marginTop: "20px" }}>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            disabled={isBusy}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            disabled={isBusy}
            style={{
              padding: "14px 20px",
              background: isBusy ? "#444" : "#7c5cff",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: isBusy ? "not-allowed" : "pointer",
              minWidth: "180px",
            }}
          >
            {existingThumbnailUrl ? "썸네일 변경하기" : "썸네일 선택하기"}
          </button>

          <p style={{ marginTop: "12px", fontSize: "14px", opacity: 0.85 }}>
            {thumbnailFile
              ? `선택된 파일: ${thumbnailFile.name}`
              : "아직 선택된 썸네일이 없어"}
          </p>
        </div>

        <p style={{ marginTop: "12px", fontSize: "14px", opacity: 0.65 }}>
          JPG, PNG 등 이미지 파일 / 최대 10MB
        </p>

        {thumbnailPreviewUrl ? (
          <div style={{ marginTop: "18px" }}>
            <p style={{ marginBottom: "10px", fontSize: "14px", opacity: 0.7 }}>
              새 썸네일 미리보기
            </p>
            <img
              src={thumbnailPreviewUrl}
              alt="thumbnail-preview"
              style={{
                width: "100%",
                maxWidth: "320px",
                borderRadius: "12px",
                border: "1px solid #333",
                display: "block",
              }}
            />
          </div>
        ) : null}

        {message ? (
          <p style={{ color: "#7CFF7C", marginTop: "18px" }}>{message}</p>
        ) : null}

        {error ? (
          <p style={{ color: "#ff6b6b", marginTop: "18px", whiteSpace: "pre-line" }}>
            {error}
          </p>
        ) : null}
      </div>

      <button
        style={{
          marginTop: "30px",
          padding: "14px 28px",
          background: isBusy ? "#666" : "#fff",
          color: "#000",
          borderRadius: "10px",
          cursor: isBusy ? "not-allowed" : "pointer",
          fontWeight: 700,
          border: "none",
        }}
        onClick={handleSave}
        disabled={isBusy}
      >
        {isSaving ? "저장 중..." : "영상 포트폴리오 저장"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid #333",
  background: "#181818",
  color: "#fff",
  outline: "none",
  fontSize: "15px",
};

export default function VideoUploadPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            background: "#000",
            minHeight: "100vh",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          }}
        >
          로딩 중...
        </div>
      }
    >
      <VideoUploadPageInner />
    </Suspense>
  );
}