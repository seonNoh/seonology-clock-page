import { describe, expect, it, vi } from 'vitest';

import {
  ADD_VIEW,
  GALLERY_VIEW,
  prependAdded,
  summarizeAdded,
  uploadImageFiles,
} from '../../src/features/clipboard/clipboardSession.js';

function file(name) {
  return new File(['clip'], name, { type: 'image/png' });
}

describe('클립보드 추가 세션', () => {
  it('뷰 이름은 갤러리와 추가 두 가지다', () => {
    expect([GALLERY_VIEW, ADD_VIEW]).toEqual(['gallery', 'add']);
  });

  it('파일을 받은 순서대로 올리고 성공한 image 객체만 배열로 돌려준다', async () => {
    const uploadOne = vi.fn(async (value) => ({ image: { id: value.name, bytes: 10, type: 'image/png' } }));
    const onSettled = vi.fn();

    const { saved, error } = await uploadImageFiles([file('a.png'), file('b.png')], uploadOne, { onSettled });

    expect(uploadOne.mock.calls.map(([value]) => value.name)).toEqual(['a.png', 'b.png']);
    expect(saved.map((image) => image.id)).toEqual(['a.png', 'b.png']);
    expect(error).toBe('');
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it('image 로 감싸지 않은 응답도 그대로 받아들인다', async () => {
    const { saved } = await uploadImageFiles([file('a.png')], async () => ({ id: 'raw' }));
    expect(saved).toEqual([{ id: 'raw' }]);
  });

  it('한 장이 실패해도 나머지를 계속 올리고 마지막 실패 메시지를 함께 돌려준다', async () => {
    const uploadOne = vi.fn()
      .mockRejectedValueOnce(new Error('Unsupported image type'))
      .mockResolvedValueOnce({ image: { id: 'ok' } });
    const onSettled = vi.fn();

    const { saved, error } = await uploadImageFiles([file('a.png'), file('b.png')], uploadOne, { onSettled });

    expect(saved.map((image) => image.id)).toEqual(['ok']);
    expect(error).toBe('Unsupported image type');
    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it('메시지 없는 실패는 기본 문구로 바꾼다', async () => {
    const { saved, error } = await uploadImageFiles([file('a.png')], async () => { throw new Error(''); });
    expect(saved).toEqual([]);
    expect(error).toBe('이미지를 저장하지 못했습니다.');
  });

  it('빈 목록이면 아무것도 올리지 않는다', async () => {
    const uploadOne = vi.fn();
    expect(await uploadImageFiles([], uploadOne)).toEqual({ saved: [], error: '' });
    expect(await uploadImageFiles(undefined, uploadOne)).toEqual({ saved: [], error: '' });
    expect(uploadOne).not.toHaveBeenCalled();
  });

  it('이번 세션 목록은 최신이 앞에 오도록 쌓는다', () => {
    const first = prependAdded([], [{ id: 'a' }, { id: 'b' }]);
    expect(first.map((image) => image.id)).toEqual(['b', 'a']);

    const second = prependAdded(first, [{ id: 'c' }]);
    expect(second.map((image) => image.id)).toEqual(['c', 'b', 'a']);
  });

  it('저장된 것이 없으면 목록을 그대로 둔다', () => {
    const previous = [{ id: 'a' }];
    expect(prependAdded(previous, [])).toBe(previous);
    expect(prependAdded(undefined, [])).toEqual([]);
  });

  it('추가한 이미지 수와 용량을 합산한다', () => {
    expect(summarizeAdded([{ bytes: 100 }, { bytes: 200 }])).toEqual({ count: 2, bytes: 300 });
    expect(summarizeAdded([{ bytes: 'x' }, {}])).toEqual({ count: 2, bytes: 0 });
    expect(summarizeAdded(undefined)).toEqual({ count: 0, bytes: 0 });
  });
});
