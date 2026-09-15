import { describe, it, expect } from 'vitest';
import { calculateTargetDimensions } from './imageCompression';

describe('calculateTargetDimensions', () => {
  it('should not scale up images smaller than maxDimension', () => {
    const dims = calculateTargetDimensions(400, 300, 640);
    expect(dims).toEqual({ width: 400, height: 300 });
  });

  it('should scale down landscape images to max width', () => {
    const dims = calculateTargetDimensions(1920, 1080, 640);
    expect(dims.width).toBe(640);
    expect(dims.height).toBe(360);
  });

  it('should scale down portrait images to max height', () => {
    const dims = calculateTargetDimensions(1080, 1920, 640);
    expect(dims.width).toBe(360);
    expect(dims.height).toBe(640);
  });

  it('should scale down square images', () => {
    const dims = calculateTargetDimensions(2000, 2000, 640);
    expect(dims).toEqual({ width: 640, height: 640 });
  });
});
