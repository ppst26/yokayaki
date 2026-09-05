/** แต้มที่ได้จากยอดสุทธิ — อัตราเดียวกับ complete_checkout (net / 10) */
export function pointsEarnedFromNet(net: number): number {
  return Math.floor(Math.max(0, net) / 10);
}

/**
 * clamp แต้มที่ขอใช้ — เทียบเคียง
 * LEAST(p_points_redeem, v_member_pts, FLOOR(r_subtotal - r_promo_disc))
 */
export function clampPointsRedeem(
  requested: number,
  memberPts: number,
  amountAfterPromo: number
): number {
  return Math.max(
    0,
    Math.min(
      Math.floor(requested),
      Math.floor(memberPts),
      Math.floor(amountAfterPromo)
    )
  );
}
