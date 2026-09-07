import { describe, expect, it } from 'vitest';

import { extractImageFiles } from '../../src/features/clipboard/pasteCapture.js';

function makeFile(name, type) {
  return new File(['clip'], name, { type });
}

function fileItem(file) {
  return { kind: 'file', type: file.type, getAsFile: () => file };
}

function stringItem(type) {
  return { kind: 'string', type, getAsFile: () => null };
}

describe('paste 이벤트에서 이미지 추출', () => {
  it('items 경로에서 이미지 파일만 고른다', () => {
    const png = makeFile('clip.png', 'image/png');
    const jpeg = makeFile('shot.jpg', 'image/jpeg');
    const pdf = makeFile('doc.pdf', 'application/pdf');

    const files = extractImageFiles({
      items: [stringItem('text/plain'), fileItem(png), fileItem(pdf), fileItem(jpeg)],
      files: [],
    });

    expect(files.map((file) => file.name)).toEqual(['clip.png', 'shot.jpg']);
  });

  it('items가 없으면 files 목록에서 이미지만 고른다', () => {
    const png = makeFile('clip.png', 'image/png');
    const text = makeFile('note.txt', 'text/plain');

    expect(extractImageFiles({ files: [text, png] }).map((file) => file.name)).toEqual(['clip.png']);
    expect(extractImageFiles({ items: [], files: [png] }).map((file) => file.name)).toEqual(['clip.png']);
  });

  it('같은 파일이 여러 항목으로 들어와도 한 번만 반환한다', () => {
    const png = makeFile('clip.png', 'image/png');

    expect(extractImageFiles({ items: [fileItem(png), fileItem(png)], files: [png] })).toHaveLength(1);
    expect(extractImageFiles({ files: [png, png] })).toHaveLength(1);
  });

  it('이미지가 없거나 clipboardData가 없으면 빈 배열을 반환한다', () => {
    expect(extractImageFiles(null)).toEqual([]);
    expect(extractImageFiles({ items: [stringItem('text/plain')], files: [] })).toEqual([]);
    expect(extractImageFiles({ items: [], files: [] })).toEqual([]);
  });
});
