export interface LoyaltyMember {
  phone_number: string;
  name: string;
  points: number;
  created_at: string;
}

export interface MemberStats {
  lifetime_spend: number;
  visit_count: number;
  last_visit_at: string | null;
  avg_per_bill: number;
}

export interface FavoriteMenu {
  menu_item_id: number;
  name: string;
  total_quantity: number;
}

export interface BillRecord {
  id: number;
  order_id: number;
  payment_method: 'cash' | 'promptpay' | 'mixed';
  subtotal: number;
  discount_amount: number;
  net_amount: number;
  points_earned: number;
  points_redeemed: number;
  created_at: string;
  table_number: number | null;
}

export interface PointsLog {
  id: number;
  adjustment: number;
  reason: string;
  adjusted_by: string;
  created_at: string;
}

export interface MemberSummary {
  phone_number: string;
  lifetime_spend: number;
  visit_count: number;
  last_visit_at: string | null;
  tags?: string[];
  rfm?: import('@/lib/memberRfm').MemberRfm | null;
}

export interface MemberProfile {
  member: LoyaltyMember;
  stats: MemberStats;
  tags?: string[];
  rfm?: import('@/lib/memberRfm').MemberRfm | null;
  favorite_menus: FavoriteMenu[];
  bills: BillRecord[];
  points_logs: PointsLog[];
}

export type PointEvent =
  | {
      kind: 'earn';
      points: number;
      order_id: number;
      at: string;
    }
  | {
      kind: 'redeem';
      points: number;
      order_id: number;
      at: string;
    }
  | {
      kind: 'manual';
      points: number;
      reason: string;
      by: string;
      at: string;
    };

export function buildPointEvents(bills: BillRecord[], logs: PointsLog[]): PointEvent[] {
  const events: PointEvent[] = [];

  for (const bill of bills) {
    if (bill.points_earned > 0) {
      events.push({
        kind: 'earn',
        points: bill.points_earned,
        order_id: bill.order_id,
        at: bill.created_at,
      });
    }
    if (bill.points_redeemed > 0) {
      events.push({
        kind: 'redeem',
        points: bill.points_redeemed,
        order_id: bill.order_id,
        at: bill.created_at,
      });
    }
  }

  for (const log of logs) {
    events.push({
      kind: 'manual',
      points: log.adjustment,
      reason: log.reason,
      by: log.adjusted_by,
      at: log.created_at,
    });
  }

  return events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
