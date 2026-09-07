export class ClipboardWriteUnsupportedError extends Error {
  constructor(message = '이 브라우저는 이미지 클립보드 쓰기를 지원하지 않습니다.') {
    super(message);
    this.name = 'ClipboardWriteUnsupportedError';
  }
}

export function isClipboardImageWriteSupported() {
  return typeof ClipboardItem !== 'undefined' && Boolean(navigator?.clipboard?.write);
}

export function isClipboardReadSupported() {
  return Boolean(navigator?.clipboard?.read);
}

// Chromium 148 실측과 WebKit 공식 문서 모두 클립보드 이미지 쓰기를 PNG 로만 보장하므로
// 저장된 원본 형식과 무관하게 PNG 로 변환해서 넘긴다.
export async function toPngBlob(blob) {
  if (!blob) throw new Error('변환할 이미지가 없습니다.');
  if (blob.type === 'image/png') return blob;

  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG 변환에 필요한 canvas를 사용할 수 없습니다.');
    context.drawImage(bitmap, 0, 0);
    const png = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/png'); });
    if (!png) throw new Error('PNG 변환에 실패했습니다.');
    return png;
  } finally {
    bitmap.close?.();
  }
}

// 사용자 제스처를 잃지 않도록 blob 을 먼저 await 하지 않고 promise 를 그대로 ClipboardItem 에 넘긴다.
export function copyImageToClipboard(loadBlob) {
  if (!isClipboardImageWriteSupported()) {
    return Promise.reject(new ClipboardWriteUnsupportedError());
  }
  const png = Promise.resolve().then(loadBlob).then(toPngBlob);
  png.catch(() => {});
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

export async function readImagesFromClipboard() {
  if (!isClipboardReadSupported()) return null;

  const items = await navigator.clipboard.read();
  const blobs = [];
  for (const item of items) {
    for (const type of item.types ?? []) {
      if (!type.startsWith('image/')) continue;
      blobs.push(await item.getType(type));
    }
  }
  return blobs;
}
