/**
 * Airtable → Supabase 일괄 마이그레이션 스크립트
 *
 * 실행:
 *   npx tsx scripts/migrate-airtable-to-supabase.ts
 *
 * 재실행 안전 (upsert 사용). 여러 번 실행해도 중복 생성 안 됨.
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

import {
  AirtableRecord,
  fetchAirtableRecords,
  formatDateToYMD,
  getField,
  normalizeText,
  pickAttachmentUrl,
  pickImage,
  toArray,
  toStringValue,
} from "./airtable-helpers";
import { getSupabaseAdmin, ArtistRow, ClosedDateRow, UserRow } from "../lib/supabase";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN || "";
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "";
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";
const CLOSED_DATES_TABLE =
  process.env.AIRTABLE_CLOSED_DATES_TABLE || "closed_dates";
const USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || "user";

const BATCH_SIZE = 100;

function transformArtist(record: AirtableRecord): ArtistRow | null {
  const fields = record.fields;

  const name = toStringValue(
    getField(fields, [
      "업체명",
      "작가명",
      "name",
      "Name",
      "artist_name",
      "작가 또는 업체명",
      "companyName",
      "company_name",
      "이름",
    ])
  );

  if (!name) {
    console.warn(`[skip] 이름 없는 레코드: ${record.id}`);
    return null;
  }

  const serviceValue = getField(fields, [
    "service",
    "services",
    "촬영서비스",
    "촬영 서비스",
    "서비스",
  ]);

  const regionValue = getField(fields, [
    "region",
    "regions",
    "촬영지역",
    "촬영 지역",
    "활동지역",
    "지역",
  ]);

  const priceValue = getField(fields, [
    "촬영비용",
    "price",
    "pricing",
    "예산",
    "가격",
    "가격대",
    "price_range",
    "금액",
  ]);

  const keywordValue = getField(fields, [
    "keywords",
    "성향키워드",
    "작가 키워드",
    "키워드",
    "keyword",
    "artist_keywords",
  ]);

  const styleKeywordsValue = getField(fields, [
    "style_keywords",
    "styleKeywords",
    "스타일키워드",
    "성향키워드",
    "촬영스타일",
  ]);

  const openchatValue = getField(fields, [
    "open_chat_url",
    "openchat_url",
    "오픈카톡",
    "오픈카톡링크",
    "오픈카톡 링크",
    "오픈채팅",
    "오픈채팅링크",
    "오픈채팅 링크",
    "문의하기",
    "문의링크",
  ]);

  const portfolioImagesValue = getField(fields, [
    "portfolio_images",
    "포트폴리오이미지",
    "포트폴리오 이미지",
    "portfolioImages",
  ]);

  const videoStyleTagsValue = getField(fields, [
    "video_style_tags",
    "videoStyleTags",
    "영상스타일태그",
    "영상 스타일 태그",
  ]);

  return {
    id: record.id,
    artist_id: toStringValue(getField(fields, ["artist_id"])) || null,
    user_id: toStringValue(getField(fields, ["user_id", "userId"])) || null,
    kakao_id: toStringValue(getField(fields, ["kakao_id", "kakaoId"])) || null,
    name,
    email:
      toStringValue(
        getField(fields, ["이메일", "email", "Email", "artist_email", "작가이메일"])
      ) || null,
    phone:
      toStringValue(
        getField(fields, ["phone", "Phone", "전화번호", "연락처", "휴대폰"])
      ) || null,
    service: toArray(serviceValue),
    region: toArray(regionValue),
    price: toStringValue(priceValue) || null,
    artist_type:
      toStringValue(
        getField(fields, ["artist_type", "artistType", "작가유형", "작가 타입"])
      ) || null,
    portfolio:
      toStringValue(getField(fields, ["포트폴리오", "portfolio", "링크"])) || null,
    image: pickImage(fields) || null,
    portfolio_images: normalizePortfolioImages(portfolioImagesValue),
    rating: Number(getField(fields, ["rating", "평점"]) || 4.8),
    style_keywords: [
      ...toArray(styleKeywordsValue),
      ...toArray(keywordValue),
    ].filter((v, i, arr) => v && arr.indexOf(v) === i),
    open_chat_url: toStringValue(openchatValue) || null,
    video_link_1: toStringValue(getField(fields, ["video_link_1"])) || null,
    video_link_2: toStringValue(getField(fields, ["video_link_2"])) || null,
    video_link_3: toStringValue(getField(fields, ["video_link_3"])) || null,
    video_link_4: toStringValue(getField(fields, ["video_link_4"])) || null,
    video_thumbnail:
      pickAttachmentUrl(
        getField(fields, [
          "video_thumbnail",
          "videoThumbnail",
          "영상썸네일",
          "대표썸네일",
        ])
      ) || null,
    video_thumb_1:
      pickAttachmentUrl(getField(fields, ["video_thumb_1"])) || null,
    video_thumb_2:
      pickAttachmentUrl(getField(fields, ["video_thumb_2"])) || null,
    video_thumb_3:
      pickAttachmentUrl(getField(fields, ["video_thumb_3"])) || null,
    video_thumb_4:
      pickAttachmentUrl(getField(fields, ["video_thumb_4"])) || null,
    video_style_tags: toArray(videoStyleTagsValue),
  };
}

function normalizePortfolioImages(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "url" in item) {
          return String((item as { url?: unknown }).url || "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function transformClosedDate(
  record: AirtableRecord,
  artistIdByEmail: Map<string, string>
): ClosedDateRow | null {
  const fields = record.fields;

  const closedDate = formatDateToYMD(
    toStringValue(
      getField(fields, ["날짜", "date", "촬영날짜", "닫힘날짜", "closed_date"])
    )
  );

  if (!closedDate) {
    console.warn(`[skip] 날짜 없는 closed_dates 레코드: ${record.id}`);
    return null;
  }

  const artistEmail = toStringValue(
    getField(fields, ["작가이메일", "artist_email", "email", "이메일"])
  );

  let artistId = toStringValue(getField(fields, ["artist_id"]));

  if (!artistId && artistEmail) {
    artistId = artistIdByEmail.get(normalizeText(artistEmail)) || "";
  }

  if (!artistId) {
    console.warn(
      `[skip] artist_id/email 없는 closed_dates 레코드: ${record.id}`
    );
    return null;
  }

  return {
    id: record.id,
    artist_id: artistId,
    closed_date: closedDate,
  };
}

async function upsertInBatches<T extends { id: string }>(
  tableName: string,
  rows: T[],
  onConflict: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict });

    if (error) {
      console.error(
        `[error] ${tableName} 배치 ${i / BATCH_SIZE + 1} 실패:`,
        error.message
      );
      console.error("실패한 레코드 ID:", batch.map((r) => r.id).join(", "));
    } else {
      console.log(
        `[ok] ${tableName} ${i + batch.length}/${rows.length} upsert 완료`
      );
    }
  }
}

function buildUsersFromArtists(artists: ArtistRow[]): UserRow[] {
  const users = new Map<string, UserRow>();

  for (const a of artists) {
    if (!a.kakao_id) continue;

    const userId = a.user_id || `user_${a.kakao_id}`;
    if (users.has(userId)) continue;

    users.set(userId, {
      id: userId,
      kakao_id: a.kakao_id,
      email: a.email,
      name: a.name,
    });
  }

  return Array.from(users.values());
}

function transformAirtableUser(record: AirtableRecord): UserRow | null {
  const fields = record.fields;
  const userId = toStringValue(getField(fields, ["user_id"]));

  if (!userId) return null;

  return {
    id: userId,
    kakao_id: toStringValue(getField(fields, ["kakao_id", "kakaoId"])) || null,
    email: toStringValue(getField(fields, ["email", "이메일"])) || null,
    name: toStringValue(getField(fields, ["name", "이름"])) || null,
  };
}

async function main() {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    throw new Error("Airtable 환경변수가 없어 (AIRTABLE_TOKEN, AIRTABLE_BASE_ID)");
  }

  console.log("1/6 Airtable artists 조회...");
  const artistRecords = await fetchAirtableRecords(
    ARTISTS_TABLE,
    AIRTABLE_TOKEN,
    AIRTABLE_BASE_ID
  );
  console.log(`   → ${artistRecords.length}건`);

  const artists = artistRecords
    .map(transformArtist)
    .filter((row): row is ArtistRow => row !== null);

  const artistIdByEmail = new Map<string, string>();
  for (const a of artists) {
    if (a.email) {
      artistIdByEmail.set(normalizeText(a.email), a.id);
    }
  }

  console.log("2/6 Supabase artists upsert...");
  await upsertInBatches("artists", artists, "id");

  console.log("3/6 Airtable users 조회...");
  let airtableUserRecords: AirtableRecord[] = [];
  try {
    airtableUserRecords = await fetchAirtableRecords(
      USERS_TABLE,
      AIRTABLE_TOKEN,
      AIRTABLE_BASE_ID
    );
    console.log(`   → ${airtableUserRecords.length}건`);
  } catch (error) {
    console.warn("users 조회 실패 (무시):", error);
  }

  const usersFromAirtable = airtableUserRecords
    .map(transformAirtableUser)
    .filter((row): row is UserRow => row !== null);

  const usersFromArtists = buildUsersFromArtists(artists);

  const userMap = new Map<string, UserRow>();
  for (const u of usersFromAirtable) userMap.set(u.id, u);
  for (const u of usersFromArtists) {
    if (!userMap.has(u.id)) userMap.set(u.id, u);
  }
  const users = Array.from(userMap.values());

  console.log(
    `4/6 Supabase users upsert (airtable ${usersFromAirtable.length} + artists 파생 ${usersFromArtists.length} → 병합 ${users.length})...`
  );
  await upsertInBatches("users", users, "id");

  console.log("5/6 Airtable closed_dates 조회...");
  let closedRecords: AirtableRecord[] = [];
  try {
    closedRecords = await fetchAirtableRecords(
      CLOSED_DATES_TABLE,
      AIRTABLE_TOKEN,
      AIRTABLE_BASE_ID
    );
    console.log(`   → ${closedRecords.length}건`);
  } catch (error) {
    console.warn("closed_dates 조회 실패 (무시):", error);
  }

  const closedDates = closedRecords
    .map((r) => transformClosedDate(r, artistIdByEmail))
    .filter((row): row is ClosedDateRow => row !== null);

  console.log("6/6 Supabase closed_dates upsert...");
  await upsertInBatches("closed_dates", closedDates, "id");

  console.log("\n✅ 마이그레이션 완료");
  console.log(`   artists: ${artists.length}건`);
  console.log(`   users: ${users.length}건`);
  console.log(`   closed_dates: ${closedDates.length}건`);
}

main().catch((error) => {
  console.error("\n❌ 마이그레이션 실패:", error);
  process.exit(1);
});
