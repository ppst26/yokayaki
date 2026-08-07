## 🗣️ Agent Communication Rules (กฎการสื่อสาร)

- สื่อสารกับผู้ใช้เป็นภาษาไทย แต่คิดและทำงานเบื้องหลังเป็นภาษาอังกฤษ
- ตอบคำถามและอธิบายให้ผู้ใช้ ภาษาไทย เสมอ
- เวลา คิด วิเคราะห์ code หรือทำงานเบื้องหลัง (reasoning) — ให้ใช้ ภาษาอังกฤษ เพื่อประหยัด token สูงสุด
- เมื่อทำการเสร็จสิ้นคำสั่ง ให้ทำการ commit code ทุกครั้ง

---

## 📝 Naming Conventions (กฎการตั้งชื่อ)

### ภาษาที่ใช้ตั้งชื่อ

- ตั้งชื่อตัวแปร ฟังก์ชัน โครงสร้าง และ interface — ใช้ **ภาษาอังกฤษ** เสมอ เพื่อความเข้ากันได้กับ Next.js, React, TypeScript, TailwindCSS ecosystem
- ก่อนการ สร้าง file spec หรือขั้นตอนการ brainstorm ให้อ่าน document md ไฟล์ที่เกี่ยวข้องเสมอโดยดูจากการตั้งชื่อ และความเกี่ยวข้อง- comment ใน source code — ให้เป็นไปตามสไตล์ที่มีอยู่ใน codebase ปัจจุบัน (โปรเจกต์นี้คอมเม้นเป็น **ภาษาไทย** เป็นหลัก ดังนั้นเขียนภาษาไทยได้ ไม่ต้องเปลี่ยน)
- เอกสารที่ให้สร้างเป็น .md จะเก็บไว้ใน docs\superpowers\specs

### File Naming Convention

| ประเภทไฟล์        | รูปแบบ                        | ตัวอย่าง                           |
| ----------------- | ----------------------------- | ---------------------------------- |
| React Components  | **PascalCase**.tsx            | `POSOrderScreen.tsx`, `PinPad.tsx` |
| Context Providers | **PascalCase**.tsx            | `AuthContext.tsx`                  |
| Utility / Lib     | **camelCase**.ts              | `supabase.ts`                      |
| SQL Migrations    | **YYYYMMDD**\_description.sql | `20260720_promotions. sql`         |
| Config files      | **lowercase** dot notation    | `next.config.ts`, `tsconfig.json`  |

### Import Path Convention

- ใช้ **`@/`** alias สำหรับ import ทุกครั้ง (ตั้งค่าใน `tsconfig.json` → `paths: { "@/*": ["./*"] }`)
- ตัวอย่าง:
  ```typescript
  import { supabase } from "@/lib/supabase";
  import { useAuth } from "@/context/AuthContext";
  ```

---
