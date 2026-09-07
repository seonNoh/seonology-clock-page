import { useEffect, useRef } from 'react';

import { extractImageFiles } from './pasteCapture.js';

export function usePasteCapture(enabled, onImages) {
  const handlerRef = useRef(onImages);

  useEffect(() => {
    handlerRef.current = onImages;
  }, [onImages]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onPaste = (event) => {
      const files = extractImageFiles(event.clipboardData);
      // 이미지가 없으면 텍스트 붙여넣기 기본 동작을 그대로 둔다.
      if (files.length === 0) return;
      event.preventDefault();
      handlerRef.current?.(files);
    };

    window.addEventListener('paste', onPaste, true);
    return () => window.removeEventListener('paste', onPaste, true);
  }, [enabled]);
}
