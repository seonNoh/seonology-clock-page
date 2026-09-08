export const GALLERY_VIEW = 'gallery';
export const ADD_VIEW = 'add';

const UPLOAD_FAILURE_MESSAGE = '이미지를 저장하지 못했습니다.';

// 파일을 받은 순서대로 하나씩 올리고, 성공한 image 객체만 모아 돌려준다.
// 한 장이 실패해도 나머지는 계속 올리고 마지막 실패 메시지를 함께 반환한다.
export async function uploadImageFiles(files, uploadOne, { onSettled } = {}) {
  const saved = [];
  let error = '';

  for (const file of files ?? []) {
    try {
      const result = await uploadOne(file);
      const image = result?.image ?? result;
      if (image) saved.push(image);
    } catch (cause) {
      error = cause?.message || UPLOAD_FAILURE_MESSAGE;
    } finally {
      onSettled?.();
    }
  }

  return { saved, error };
}

// 이번 추가 세션 목록은 최신이 앞이다.
export function prependAdded(previous, saved) {
  if (!saved?.length) return previous ?? [];
  return [...saved].reverse().concat(previous ?? []);
}

export function summarizeAdded(added) {
  const items = added ?? [];
  return {
    count: items.length,
    bytes: items.reduce((sum, image) => sum + (Number(image?.bytes) || 0), 0),
  };
}
