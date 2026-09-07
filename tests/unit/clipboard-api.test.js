import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clipboardImageUrl,
  deleteClipboardImage,
  fetchClipboardImageBlob,
  listClipboardImages,
  uploadClipboardImage,
} from '../../src/features/clipboard/clipboardApi.js';
import { API_BASE } from '../../src/api/client.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function response(body, status = 200, extra = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    ...extra,
  };
}

describe('클립보드 이미지 API 클라이언트', () => {
  it('이미지 주소는 API_BASE 아래의 고정 경로를 사용한다', () => {
    expect(clipboardImageUrl('abc123')).toBe(`${API_BASE}/api/clipboard/images/abc123`);
    expect(clipboardImageUrl('a/b')).toBe(`${API_BASE}/api/clipboard/images/a%2Fb`);
  });

  it('목록, 업로드, 삭제를 정확한 경로와 헤더로 요청한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ images: [], totalBytes: 0, limits: {} }))
      .mockResolvedValueOnce(response({ image: { id: 'abc' } }, 201))
      .mockResolvedValueOnce(response({}, 204));
    vi.stubGlobal('fetch', fetchMock);

    const blob = new Blob(['png'], { type: 'image/png' });
    await listClipboardImages();
    await uploadClipboardImage(blob);
    await deleteClipboardImage('abc123');

    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method ?? 'GET'])).toEqual([
      [`${API_BASE}/api/clipboard/images`, 'GET'],
      [`${API_BASE}/api/clipboard/images`, 'POST'],
      [`${API_BASE}/api/clipboard/images/abc123`, 'DELETE'],
    ]);

    const upload = fetchMock.mock.calls[1][1];
    expect(upload.headers['Content-Type']).toBe('image/png');
    expect(upload.body).toBe(blob);
  });

  it('업로드가 실패하면 서버가 보낸 error 메시지를 그대로 올린다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'Unsupported image type' }, 400)));

    await expect(uploadClipboardImage(new Blob(['x'], { type: 'text/plain' })))
      .rejects.toThrow('Unsupported image type');
  });

  it('서버가 JSON을 주지 않으면 상태 코드를 담은 메시지로 대체한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: vi.fn().mockRejectedValue(new Error('not json')),
    }));

    await expect(uploadClipboardImage(new Blob(['x'], { type: 'image/png' })))
      .rejects.toThrow('이미지 저장이 상태 413로 실패했습니다.');
  });

  it('이미지 본문은 Blob으로 받고 실패는 오류로 올린다', async () => {
    const blob = new Blob(['png'], { type: 'image/png' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, blob: vi.fn().mockResolvedValue(blob) })
      .mockResolvedValueOnce({ ok: false, status: 404, blob: vi.fn() });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchClipboardImageBlob('abc123')).resolves.toBe(blob);
    await expect(fetchClipboardImageBlob('abc123')).rejects.toThrow('이미지를 불러오지 못했습니다 (상태 404).');
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/api/clipboard/images/abc123`);
  });
});
