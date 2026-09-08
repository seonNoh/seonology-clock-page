import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatTime,
  formatType,
  formatUsage,
} from '../../src/features/clipboard/clipboardFormat.js';

describe('클립보드 표시 형식', () => {
  it('용량은 B, KB, MB 단위로 끊어 적는다', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(12.3 * 1024 * 1024)).toBe('12.3 MB');
    expect(formatBytes(undefined)).toBe('0 B');
  });

  it('형식은 image/ 뒤를 대문자로 쓰고 아니면 IMAGE 로 둔다', () => {
    expect(formatType('image/png')).toBe('PNG');
    expect(formatType('image/jpeg')).toBe('JPEG');
    expect(formatType('application/pdf')).toBe('IMAGE');
    expect(formatType(undefined)).toBe('IMAGE');
  });

  it('시각을 읽을 수 없으면 시각 미상으로 적는다', () => {
    expect(formatTime('not-a-date')).toBe('시각 미상');
    expect(formatTime(undefined)).toBe('시각 미상');
    expect(formatTime('2026-09-08T00:00:00.000Z')).not.toBe('시각 미상');
  });

  it('사용량 줄은 한도가 있으면 장수까지 함께 적는다', () => {
    expect(formatUsage({
      totalBytes: 12.3 * 1024 * 1024,
      count: 3,
      limits: { maxTotalBytes: 256 * 1024 * 1024, maxItems: 100 },
    })).toBe('사용량 12.3 MB / 256.0 MB · 3 / 100');

    expect(formatUsage({ totalBytes: 2048, count: 2, limits: null })).toBe('사용량 2.0 KB · 2장');
  });
});
