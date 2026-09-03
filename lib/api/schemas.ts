import 'server-only';
import { z } from 'zod';
import { VOID_REASON_OTHER, VOID_REASONS } from '@/lib/voidReasons';

// =============================================================
// Zod schemas สำหรับทุก API route (M1/D5)
// =============================================================

export const MAX_ORDER_ITEMS = 40;

const pinRegex = /^\d{6}$/;

const voidReasonCodes = VOID_REASONS.map(r => r.code) as [string, ...string[]];

export const pinSchema = z
  .string()
  .regex(pinRegex, 'PIN ต้องเป็นตัวเลข 6 หลัก');

export const employeeRoleSchema = z.enum(['owner', 'staff'], {
  message: 'ตำแหน่งไม่ถูกต้อง',
});

export const sessionIdSchema = z.string().uuid('เซสชันไม่ถูกต้อง');

export const employeeIdParamSchema = z.coerce.number().int().positive('รหัสพนักงานไม่ถูกต้อง');

export const orderItemIdParamSchema = z.coerce.number().int().positive('รหัสรายการไม่ถูกต้อง');

export const loginBodySchema = z.object({
  pin: pinSchema,
});

const orderLineSchema = z.object({
  menuItemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  notes: z
    .union([z.string(), z.null()])
    .optional()
    .transform(v => {
      if (typeof v !== 'string') return null;
      const t = v.trim();
      return t ? t.slice(0, 255) : null;
    }),
});

export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderItemsSchema = z
  .array(orderLineSchema)
  .min(1, 'รายการสั่งอาหารไม่ถูกต้อง')
  .max(MAX_ORDER_ITEMS, 'รายการสั่งอาหารไม่ถูกต้อง');

export const staffOrderBodySchema = z.object({
  tableId: z.number().int().positive('รหัสโต๊ะไม่ถูกต้อง'),
  items: orderItemsSchema,
});

export const customerOrderBodySchema = z.object({
  items: orderItemsSchema,
});

export const employeeCreateBodySchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อพนักงาน'),
  pin: pinSchema,
  role: employeeRoleSchema,
});

export const employeeUpdateBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  pin: pinSchema.optional(),
  role: employeeRoleSchema.optional(),
  confirmPin: pinSchema.optional(),
});

export const employeeDeleteBodySchema = z.object({
  confirmPin: pinSchema,
});

export const voidReasonCodeSchema = z.enum(voidReasonCodes, {
  message: 'เหตุผล Void ไม่ถูกต้อง',
});

export const voidOrderBodySchema = z
  .object({
    orderItemId: z.number().int().positive(),
    voidQuantity: z.number().int().min(1).max(99),
    reasonCode: voidReasonCodeSchema,
    reasonNote: z
      .union([z.string(), z.null()])
      .optional()
      .transform(v => {
        if (typeof v !== 'string') return null;
        const t = v.trim();
        return t ? t.slice(0, 255) : null;
      }),
  })
  .refine(
    data => data.reasonCode !== VOID_REASON_OTHER || data.reasonNote,
    { message: 'กรุณาระบุเหตุผลในการ Void', path: ['reasonNote'] }
  );

export const checkoutBodySchema = z.object({
  orderId: z.number().int().positive(),
  cashReceived: z.number().min(0),
  couponCode: z
    .union([z.string(), z.null()])
    .optional()
    .transform(v => {
      if (typeof v !== 'string') return null;
      const t = v.trim();
      return t ? t.slice(0, 30) : null;
    }),
  phoneNumber: z
    .union([z.string(), z.null()])
    .optional()
    .transform(v => {
      if (typeof v !== 'string') return null;
      const t = v.replace(/\D/g, '');
      return /^\d{10}$/.test(t) ? t : null;
    }),
  pointsRedeem: z.number().int().min(0).optional().default(0),
});

export const kitchenServeBatchSchema = z.object({
  itemIds: z.array(z.number().int().positive()).min(1).max(50),
});

export const loyaltyMemberBodySchema = z.object({
  phoneNumber: z.string().transform(v => v.replace(/\D/g, '')).pipe(
    z.string().regex(/^\d{10}$/, 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก')
  ),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ'),
});

export function orderLinesToRpcJson(items: OrderLine[]) {
  return items.map(i => ({
    menu_item_id: i.menuItemId,
    quantity: i.quantity,
    notes: i.notes,
  }));
}

export const r2UploadFolderSchema = z.enum(['menu', 'promo']);

export const r2PresignBodySchema = z.object({
  folder: r2UploadFolderSchema,
  contentType: z.string().min(1),
  contentLength: z.number().int().positive(),
});

export const r2DeleteBodySchema = z.object({
  url: z.string().min(1),
});
