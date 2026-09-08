import { describe, expect, it } from 'vitest';
import {
  memberHasTag,
  parseMemberTags,
  sortMemberTags,
} from './memberTags';

describe('memberTags', () => {
  it('parseMemberTags filters invalid codes and sorts', () => {
    expect(parseMemberTags(['vip', 'invalid', 'new'])).toEqual(['vip', 'new']);
  });

  it('sortMemberTags orders vip before dormant', () => {
    expect(sortMemberTags(['dormant', 'vip', 'regular'])).toEqual([
      'vip',
      'regular',
      'dormant',
    ]);
  });

  it('memberHasTag checks inclusion', () => {
    expect(memberHasTag(['new'], 'new')).toBe(true);
    expect(memberHasTag(['new'], 'vip')).toBe(false);
  });
});
