import { randomBytes } from "crypto";

/**
 * Airtable 호환 레코드 ID 형식: `rec` + 14자 base64url
 * 사용 위치: artists.id, closed_dates.id, 기타 PK가 TEXT인 테이블
 */
export function makeRecordId(): string {
  return `rec${randomBytes(12).toString("base64url").slice(0, 14)}`;
}

/**
 * 내부 작가 코드 형식: `artist_` + 12자 base64url
 * 사용 위치: artists.artist_id (Airtable 호환 + UNIQUE)
 */
export function makeArtistCode(): string {
  return `artist_${randomBytes(9).toString("base64url").slice(0, 12)}`;
}
