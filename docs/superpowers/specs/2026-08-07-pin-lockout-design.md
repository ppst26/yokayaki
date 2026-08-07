# PIN Login Rate Limiting & Lockout Design Spec

## 1. Overview
To prevent unauthorized brute-force attempts on the YOKAYAKI POS PIN login keypad (`PinPad.tsx`), a rate limiting and temporary lockout mechanism is introduced. Entering an incorrect 6-digit PIN 3 times consecutively locks out the keypad for 3 minutes (180 seconds). The lockout countdown state is persisted in `localStorage` to prevent bypass via page refresh (`F5`).

## 2. Key Requirements
- **Max Attempts**: 3 consecutive failed PIN attempts.
- **Lockout Duration**: 3 minutes (180 seconds).
- **Persistence**: Save `lockoutUntil` timestamp to `localStorage` (`yokayaki_pin_lockout_until`) and failed attempts count (`yokayaki_pin_failed_attempts`).
- **Real-time Countdown**: Show live countdown (`MM:SS`) when locked out.
- **UI State**:
  - **Attempts 1 & 2**: Show error message with remaining attempts count (e.g. `รหัส PIN ไม่ถูกต้อง (เหลืออีก 2 ครั้ง)`).
  - **Attempt 3 (Lockout)**: Lockout overlay/view with red lock icon, warning headline, live countdown timer (`02:59`), and disabled keypad inputs.
  - **Expiration**: When timer reaches zero, clear lockout, reset failed attempts count, and restore standard PIN keypad.

## 3. Architecture & Data Flow

### AuthContext State Extensions
- `failedAttempts` (number, default `0`)
- `lockoutUntil` (number | null, unix timestamp in ms)
- `remainingLockoutSeconds` (number, default `0`)

### Login Attempt Flow
1. User enters 6-digit PIN.
2. `loginWithPin(pin)` executes.
3. **If PIN correct**:
   - Reset `failedAttempts` = 0.
   - Clear `yokayaki_pin_failed_attempts` and `yokayaki_pin_lockout_until` from `localStorage`.
   - Log employee in.
4. **If PIN incorrect**:
   - Increment `failedAttempts` count.
   - If `failedAttempts` < 3:
     - Save `failedAttempts` to `localStorage`.
     - Set error message with remaining attempts count.
   - If `failedAttempts` >= 3:
     - Calculate `lockoutUntil` = `Date.now() + 3 * 60 * 1000` (3 minutes).
     - Save `lockoutUntil` to `localStorage`.
     - Trigger lockout mode in `PinPad.tsx`.

### Timer Hook / Interval logic
- On `PinPad` mount or state change:
  - Check `localStorage` for `yokayaki_pin_lockout_until`.
  - If present and in future: calculate remaining seconds and start a `1-second interval` tick.
  - When remaining seconds hit `0`, clear interval, clear `localStorage`, reset attempts, and restore keypad.

## 4. UI Design Specs (PinPad.tsx)

### Lockout Card View
- **Icon**: Red rounded box with `Lock` icon and subtle glow.
- **Title**: `ระบบถูกล็อคชั่วคราว` (Red/Slate-900 font-black).
- **Subtext**: `กรุณาลองใหม่อีกครั้งเนื่องจากระบุ PIN ไม่ถูกต้องเกิน 3 ครั้ง`.
- **Countdown Badge**: Large styled badge with clock icon showing `MM:SS` (e.g. `02:59`).
- **Footer text**: `ระบบจะปลดล็อคให้อัตโนมัติเมื่อครบเวลา`.

## 5. Verification Plan
- **Test Case 1**: Enter wrong PIN once -> verifies error text shows `(เหลืออีก 2 ครั้ง)`.
- **Test Case 2**: Enter wrong PIN second time -> error text shows `(เหลืออีก 1 ครั้งสุดท้าย)`.
- **Test Case 3**: Enter wrong PIN third time -> Lockout screen appears immediately with `03:00` countdown, keypad hidden/disabled.
- **Test Case 4 (Persistence)**: Press `F5` / refresh page while locked out -> Lockout screen remains active with accurate remaining time.
- **Test Case 5 (Completion)**: Wait or mock timer expiration -> Lockout screen disappears, keypad becomes active, user can log in with correct PIN.
