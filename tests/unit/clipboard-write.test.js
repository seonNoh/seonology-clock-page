import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ClipboardWriteUnsupportedError,
  copyImageToClipboard,
  isClipboardImageWriteSupported,
} from '../../src/features/clipboard/clipboardWrite.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubSupportedClipboard() {
  const created = [];
  class FakeClipboardItem {
    constructor(items) {
      this.items = items;
      created.push(items);
    }
  }
  const write = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('ClipboardItem', FakeClipboardItem);
  vi.stubGlobal('navigator', { clipboard: { write } });
  return { created, write };
}

describe('클립보드 이미지 쓰기', () => {
  it('ClipboardItem이나 write가 없으면 지원하지 않는 것으로 판정한다', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    vi.stubGlobal('navigator', { clipboard: { write: vi.fn() } });
    expect(isClipboardImageWriteSupported()).toBe(false);

    vi.stubGlobal('ClipboardItem', class {});
    vi.stubGlobal('navigator', { clipboard: {} });
    expect(isClipboardImageWriteSupported()).toBe(false);

    await expect(copyImageToClipboard(() => new Blob())).rejects.toBeInstanceOf(ClipboardWriteUnsupportedError);
  });

  it('둘 다 있으면 지원하는 것으로 판정한다', () => {
    stubSupportedClipboard();
    expect(isClipboardImageWriteSupported()).toBe(true);
  });

  it('blob을 기다리지 않고 ClipboardItem에 image/png promise를 넘겨 사용자 제스처를 유지한다', async () => {
    const { created, write } = stubSupportedClipboard();
    const png = new Blob(['png'], { type: 'image/png' });
    let resolveBlob;
    const pending = new Promise((resolve) => { resolveBlob = resolve; });
    const loadBlob = vi.fn(() => pending);

    const result = copyImageToClipboard(loadBlob);

    expect(loadBlob).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0]).toHaveLength(1);
    expect(created).toHaveLength(1);
    expect(Object.keys(created[0])).toEqual(['image/png']);
    expect(typeof created[0]['image/png'].then).toBe('function');

    resolveBlob(png);
    await expect(created[0]['image/png']).resolves.toBe(png);
    await expect(result).resolves.toBeUndefined();
    expect(loadBlob).toHaveBeenCalledTimes(1);
  });

  it('blob을 불러오지 못하면 ClipboardItem에 넘긴 promise가 그 오류로 거부된다', async () => {
    const { created } = stubSupportedClipboard();

    copyImageToClipboard(() => Promise.reject(new Error('이미지를 불러오지 못했습니다 (상태 404).')));

    await expect(created[0]['image/png']).rejects.toThrow('이미지를 불러오지 못했습니다 (상태 404).');
  });
});
