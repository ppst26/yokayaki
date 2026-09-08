"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { storeTimestampRange } from '@/lib/storeDateRange';
import {
  parseRetentionAnalytics,
  type RetentionAnalytics,
} from '@/lib/retentionAnalytics';

const EMPTY: RetentionAnalytics = {
  member_vs_walkin: {
    member: { bills: 0, net: 0, points_redeemed: 0 },
    walkin: { bills: 0, net: 0, points_redeemed: 0 },
    member_share_pct: 0,
  },
  promo_roi: [],
  heatmap: { hours: [], dows: [], cells: [] },
};

export function useRetentionAnalytics(
  startDate: Date,
  endDate: Date,
  refreshKey: number,
): { data: RetentionAnalytics; loading: boolean } {
  const [data, setData] = useState<RetentionAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { startISO, endISO } = storeTimestampRange(startDate, endDate);
        const { data: raw, error } = await supabase.rpc('get_retention_analytics', {
          p_start: startISO,
          p_end: endISO,
        });
        if (error) {
          console.error('useRetentionAnalytics:', error.message || error.code || error);
          if (!cancelled) setData(EMPTY);
          return;
        }
        if (!cancelled) setData(parseRetentionAnalytics(raw));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('useRetentionAnalytics:', msg);
        if (!cancelled) setData(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, refreshKey]);

  return { data, loading };
}
