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
  ]),
  // หนี้เก่า 84 จุดที่ค้างมาก่อนตั้ง CI — ลดเป็น warn ไว้ก่อนเพื่อไม่ให้บล็อกงานที่เข้ามาใหม่
  // แล้วทยอยไล่แก้เป็น sprint แยก · แก้หมดรายการไหนให้ลบออกจากบล็อกนี้
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
