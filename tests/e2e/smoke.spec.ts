import { test, expect } from "@playwright/test";

/**
 * 스모크 레벨: public 경로 + API health + 핵심 UI 엘리먼트 존재 확인.
 * 로그인/작가 쓰기 경로는 OAuth/DB 의존성이 커 여기서는 다루지 않는다.
 */

test.describe("public smoke", () => {
  test("루트 페이지가 200 + 헤더 로고 렌더", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByAltText("DayPic 로고").first()).toBeVisible();
  });

  test("/search 페이지 검색 폼 렌더", async ({ page }) => {
    await page.goto("/search");
    await expect(
      page.getByText("내 결혼식 촬영", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /작가 검색/ })).toBeVisible();
  });

  test("/checklist 페이지 로드", async ({ page }) => {
    const response = await page.goto("/checklist");
    expect(response?.status()).toBeLessThan(400);
  });

  test("/tips 페이지 로드", async ({ page }) => {
    const response = await page.goto("/tips");
    expect(response?.status()).toBeLessThan(400);
  });

  test("로그인 페이지 로드", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBeLessThan(400);
  });
});

test.describe("api smoke", () => {
  test("GET /api/health 200 + ok=true + 세 테이블 ping", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checks).toHaveProperty("artists");
    expect(body.checks).toHaveProperty("closed_dates");
    expect(body.checks).toHaveProperty("video_portfolio_items");
  });

  test("GET /api/me 비로그인 상태 isLoggedIn=false", async ({ request }) => {
    const res = await request.get("/api/me");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.isLoggedIn).toBe(false);
  });

  test("GET /api/search 날짜 없이 호출 시 empty 가능", async ({ request }) => {
    const res = await request.get("/api/search");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.artists)).toBe(true);
  });

  test("GET /api/search 응답에 email 필드 없음 (PII 누설 차단 회귀)", async ({
    request,
  }) => {
    const res = await request.get("/api/search");
    const body = await res.json();
    for (const artist of body.artists ?? []) {
      expect(artist.email).toBeUndefined();
    }
  });

  test("GET /api/search 응답에 레거시 video_link_* / video_thumbnail 없음", async ({
    request,
  }) => {
    const res = await request.get("/api/search");
    const body = await res.json();
    for (const artist of body.artists ?? []) {
      expect(artist.video_link_1).toBeUndefined();
      expect(artist.video_thumbnail).toBeUndefined();
      expect(Array.isArray(artist.video_portfolio_items)).toBe(true);
    }
  });

  test("PATCH /api/artists/[id] 비로그인 401", async ({ request }) => {
    const res = await request.patch("/api/artists/recXXX", {
      data: { phone: "010-0000-0000" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/cloudinary/sign 비로그인 401", async ({ request }) => {
    const res = await request.post("/api/cloudinary/sign");
    expect(res.status()).toBe(401);
  });

  test("POST /api/artist-closed 비로그인 401", async ({ request }) => {
    const res = await request.post("/api/artist-closed", {
      data: { date: "2026-12-31" },
    });
    expect(res.status()).toBe(401);
  });
});
