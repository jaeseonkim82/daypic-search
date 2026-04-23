/**
 * Supabase 스키마를 lib/database.types.ts 로 재생성.
 *
 * 실행: npm run gen:types
 * 필요 env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ACCESS_TOKEN
 */
import { config } from "dotenv";
import path from "path";
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  console.error("NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았어");
  process.exit(1);
}

const ref = url.match(/https?:\/\/([^.]+)\./)?.[1];
if (!ref) {
  console.error(`NEXT_PUBLIC_SUPABASE_URL 형식 오류: ${url}`);
  process.exit(1);
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error(
    "SUPABASE_ACCESS_TOKEN 이 필요해 (https://supabase.com/dashboard/account/tokens 에서 발급 후 .env.local 에 추가)",
  );
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["supabase", "gen", "types", "typescript", "--project-id", ref],
  { encoding: "utf-8", env: process.env },
);

if (result.status !== 0) {
  console.error(result.stderr || "supabase gen types 실패");
  process.exit(1);
}

const outPath = path.resolve(process.cwd(), "lib/database.types.ts");
writeFileSync(outPath, result.stdout);
console.log(`✓ ${outPath} 업데이트됨`);
