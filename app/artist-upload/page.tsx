export default function ArtistUploadPage() {
  return (
    <main style={{ padding: "40px", maxWidth: "720px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "12px" }}>
        작가 대표사진 업로드
      </h1>

      <p style={{ fontSize: "16px", color: "#555", lineHeight: 1.6 }}>
        이 페이지는 작가가 대표사진을 업로드하는 전용 페이지야.
        <br />
        지금은 연결 테스트 단계라서, 우선 페이지가 잘 열리는지만 확인할 거야.
      </p>

      <div
        style={{
          marginTop: "24px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          background: "#fafafa",
        }}
      >
        업로드 기능은 다음 단계에서 붙일 거야.
      </div>
    </main>
  );
}