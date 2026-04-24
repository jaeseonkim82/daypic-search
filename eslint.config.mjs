import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tests/e2e/**",
  ]),
  {
    rules: {
      // React 19 / eslint-plugin-react-hooks 최신 룰: useEffect 내 setState 호출을
      // 에러로 판정. 현 코드베이스의 localStorage 초기화/selectedDate 기본 선택 등
      // 수 건이 걸리므로 warning 으로 완화. 새 코드는 파생값으로 지양 권장.
      "react-hooks/set-state-in-effect": "warn",
      // 점진 마이그레이션 중 any 잔존 부분은 warn 으로 완화 (search page normalize 경로).
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
