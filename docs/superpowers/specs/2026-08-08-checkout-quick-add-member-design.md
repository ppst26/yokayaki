# Quick Add Member on Checkout Screen — Design Spec

> **ตำแหน่งไฟล์สเปก:** `docs/superpowers/specs/2026-08-08-checkout-quick-add-member-design.md`  
> **วันอัปเดตล่าสุด:** 8 สิงหาคม 2569  
> **สถานะ:** ใช้งานบน Production (Active)

---

## 🎯 Overview
Add a direct **`[ + เพิ่มสมาชิก ]`** button on the CRM card header in `CheckoutScreen` allowing cashiers to register new loyalty members on-the-fly and automatically earn points for the current bill upon checkout.

---

## 📐 Detailed Flow & Architecture

### 1. Can a newly added member earn points for the current bill immediately?
- **YES (100% Supported):**
  1. Cashier clicks `[ + เพิ่มสมาชิก ]` on `CheckoutScreen`.
  2. Enters Phone Number (10 digits) & Customer Name.
  3. Customer is saved to `loyalty_members` table with initial 0 points.
  4. Active member state is instantly set to the new member (`phone_number`, `name`, `points: 0`).
  5. Upon completing checkout (`complete_checkout` RPC), `p_phone_number` is passed to the Database.
  6. Database calculates `pointsEarned` (e.g. `floor(net_amount / 25)`) and automatically adds points to the newly registered member's account.

### 2. UI Updates (`CRMMemberCard.tsx` & `CheckoutScreen.tsx`)
- **Card Header:** Add `[ + เพิ่มสมาชิก ]` button in the top-right corner of CRM Member Card.
- **Add Member Modal / Inline Form:**
  - Phone Number Input (10 digits, auto-validated).
  - Customer Name Input (Required).
  - Submit Button (`[ ✅ บันทึกและเลือกสมาชิก ]`).
- **Notification:** Toast/alert confirming `"สมัครสมาชิกสำเร็จ! จะได้รับ N แต้มจากบิลนี้ทันทีหลังชำระเงิน"`.

---

## 📁 Files Affected
- `components/checkout/CRMMemberCard.tsx`
- `components/checkout/CheckoutScreen.tsx`
