import { useCallback, useEffect, useRef, useState } from 'react';

import ClipboardAddView from './ClipboardAddView.jsx';
import ClipboardGallery from './ClipboardGallery.jsx';
import {
  deleteClipboardImage,
  fetchClipboardImageBlob,
  listClipboardImages,
  uploadClipboardImage,
} from './clipboardApi.js';
import {
  ADD_VIEW,
  GALLERY_VIEW,
  prependAdded,
  uploadImageFiles,
} from './clipboardSession.js';
import {
  ClipboardWriteUnsupportedError,
  copyImageToClipboard,
  isClipboardReadSupported,
  readImagesFromClipboard,
} from './clipboardWrite.js';
import { usePasteCapture } from './usePasteCapture.js';
import './clipboard.css';

const POLL_INTERVAL_MS = 15000;
const COPIED_RESET_MS = 1500;
const CLIPBOARD_READ_SUPPORTED = isClipboardReadSupported();

function ClipboardImagesPanel({ isOpen, onClose }) {
  // 도구는 닫힐 때 언마운트되므로 열 때마다 갤러리에서 시작한다.
  const [view, setView] = useState(GALLERY_VIEW);
  const [images, setImages] = useState([]);
  const [addedImages, setAddedImages] = useState([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const [busyIds, setBusyIds] = useState([]);
  const copyTimerRef = useRef(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const data = await listClipboardImages();
      setImages(Array.isArray(data?.images) ? data.images : []);
      setTotalBytes(Number(data?.totalBytes) || 0);
      setLimits(data?.limits ?? null);
      setError('');
    } catch (cause) {
      setError(cause?.message || '목록을 불러오지 못했습니다.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const uploadFiles = useCallback(async (files) => {
    if (!files?.length) return [];
    setUploadingCount((count) => count + files.length);
    const { saved, error: failure } = await uploadImageFiles(files, uploadClipboardImage, {
      onSettled: () => setUploadingCount((count) => Math.max(0, count - 1)),
    });
    setAddedImages((previous) => prependAdded(previous, saved));
    setError(failure);
    await refresh({ quiet: true });
    return saved;
  }, [refresh]);

  // 붙여넣기 가로채기는 추가 화면에서만 건다. 갤러리에서는 기본 동작을 그대로 둔다.
  usePasteCapture(isOpen && view === ADD_VIEW, uploadFiles);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    const load = (quiet) => { if (active) refresh({ quiet }); };
    // 첫 조회를 microtask 로 미뤄 effect 본문에서 곧바로 상태를 바꾸지 않는다.
    queueMicrotask(() => load(false));
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isOpen, refresh]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const handleCopy = (id) => {
    setCopyError(null);
    // 사용자 제스처 안에서 동기적으로 호출해야 Safari 에서 클립보드 쓰기가 허용된다.
    copyImageToClipboard(() => fetchClipboardImageBlob(id))
      .then(() => {
        setCopiedId(id);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopiedId(null), COPIED_RESET_MS);
      })
      .catch((cause) => {
        setCopyError({
          id,
          message: cause instanceof ClipboardWriteUnsupportedError
            ? '이 브라우저는 이미지 복사를 지원하지 않습니다.'
            : (cause?.message || '클립보드에 복사하지 못했습니다.'),
        });
      });
  };

  const handleDelete = async (id) => {
    setBusyIds((ids) => [...ids, id]);
    try {
      await deleteClipboardImage(id);
      setError('');
      await refresh({ quiet: true });
    } catch (cause) {
      setError(cause?.message || '이미지를 삭제하지 못했습니다.');
    } finally {
      setBusyIds((ids) => ids.filter((value) => value !== id));
    }
  };

  const handleImportFromClipboard = async () => {
    try {
      const blobs = await readImagesFromClipboard();
      if (!blobs?.length) {
        setError('클립보드에서 이미지를 찾지 못했습니다.');
        return;
      }
      await uploadFiles(blobs);
    } catch (cause) {
      setError(cause?.message || '클립보드를 읽지 못했습니다.');
    }
  };

  // 추가 화면은 들어갈 때마다 이번 세션 목록을 비운다.
  const handleOpenAdd = () => {
    setAddedImages([]);
    setError('');
    setView(ADD_VIEW);
  };

  const handleBackToGallery = () => {
    setError('');
    setView(GALLERY_VIEW);
  };

  if (!isOpen) return null;

  return (
    <div className="clip-overlay" onClick={onClose}>
      <div
        className="clip-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="clip-header">
          <div className="clip-header-left">
            <svg className="clip-header-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M8 13l2.5 2.5L16 10" />
            </svg>
            <span className="clip-header-title" id="clip-dialog-title">Clipboard Images</span>
          </div>
          <div className="clip-actions">
            {view === GALLERY_VIEW ? (
              <>
                <button type="button" className="clip-action-btn" onClick={handleOpenAdd}>
                  추가
                </button>
                <button type="button" className="clip-action-btn" onClick={() => refresh()} disabled={loading}>
                  새로고침
                </button>
              </>
            ) : (
              <>
                <button type="button" className="clip-action-btn" onClick={handleBackToGallery}>
                  갤러리로
                </button>
                {CLIPBOARD_READ_SUPPORTED && (
                  <button type="button" className="clip-action-btn" onClick={handleImportFromClipboard}>
                    클립보드에서 가져오기
                  </button>
                )}
              </>
            )}
            <button type="button" className="clip-close-btn" onClick={onClose} aria-label="닫기">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {view === GALLERY_VIEW ? (
          <ClipboardGallery
            images={images}
            totalBytes={totalBytes}
            limits={limits}
            loading={loading}
            error={error}
            copiedId={copiedId}
            copyError={copyError}
            busyIds={busyIds}
            onCopy={handleCopy}
            onDelete={handleDelete}
          />
        ) : (
          <ClipboardAddView
            addedImages={addedImages}
            uploadingCount={uploadingCount}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

export default ClipboardImagesPanel;
