# Customer Check Bill Button Lock Spec

## Overview
This design locks the "เรียกเช็คบิล / ชำระเงิน" (Check Bill / Payment) button on the Customer Order Portal (`app/customer/[session_id]/page.tsx`) whenever there are unserved items pending in the kitchen.

---

## Detailed Specifications

### 1. Condition & Button State (`app/customer/[session_id]/page.tsx`)
- Compute `pendingCount`: Number of `orderedItems` where `status === 'pending'`.
- When `pendingCount > 0`:
  - `disabled={true}`
  - Styling: `w-full py-3.5 bg-slate-200 text-slate-500 font-extrabold text-xs sm:text-sm rounded-2xl border border-slate-300 flex items-center justify-center gap-2 cursor-not-allowed shadow-none`
  - Icon: `Clock` or `AlertCircle`
  - Button Text: `กรุณารออาหารเสริฟครบ ก่อนเรียกเช็คบิล`
- When `pendingCount === 0`:
  - `disabled={false}`
  - Styling: `w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-red-600/20 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer`
  - Icon: `BellRing`
  - Button Text: `เรียกเช็คบิล / ชำระเงิน`

---

## Files to Modify
- [app/customer/[session_id]/page.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/app/customer/%5Bsession_id%5D/page.tsx)
