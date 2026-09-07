import { useCallback, useEffect, useRef, useState } from 'react';

import {
  clipboardImageUrl,
  deleteClipboardImage,
  fetchClipboardImageBlob,
  listClipboardImages,
  uploadClipboardImage,
} from './clipboardApi.js';
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
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'medium' });

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatType(value) {
  return typeof value === 'string' && value.startsWith('image/')
    ? value.slice('image/'.length).toUpperCase()
    : 'IMAGE';
}

function formatTime(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? '시각 미상' : TIME_FORMAT.format(new Date(time));
}

function ClipboardImagesPanel({ isOpen, onClose }) {
  const [images, setImages] = useState([]);
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
    if (!files?.length) return;
    setUploadingCount((count) => count + files.length);
    let failure = '';
    for (const file of files) {
      try {
        await uploadClipboardImage(file);
      } catch (cause) {
        failure = cause?.message || '이미지를 저장하지 못했습니다.';
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    }
    setError(failure);
    await refresh({ quiet: true });
  }, [refresh]);

  usePasteCapture(isOpen, uploadFiles);

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

  if (!isOpen) return null;

  const usage = limits
    ? `사용량 ${formatBytes(totalBytes)} / ${formatBytes(limits.maxTotalBytes)} · ${images.length} / ${limits.maxItems}`
    : `사용량 ${formatBytes(totalBytes)} · ${images.length}장`;

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
            {CLIPBOARD_READ_SUPPORTED && (
              <button type="button" className="clip-action-btn" onClick={handleImportFromClipboard}>
                클립보드에서 가져오기
              </button>
            )}
            <button type="button" className="clip-action-btn" onClick={() => refresh()} disabled={loading}>
              새로고침
            </button>
            <button type="button" className="clip-close-btn" onClick={onClose} aria-label="닫기">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <p className="clip-hint">
          Ctrl+V 또는 Cmd+V 로 이미지를 붙여넣으면 바로 저장됩니다. {usage}
        </p>

        {(uploadingCount > 0 || loading || error) && (
          <div className={`clip-status${error ? ' clip-status--error' : ''}`} role="status">
            {error || (uploadingCount > 0 ? `이미지 ${uploadingCount}장을 저장하고 있습니다.` : '목록을 불러오고 있습니다.')}
          </div>
        )}

        <div className="clip-grid">
          {images.map((image) => (
            <article className="clip-card" key={image.id}>
              <img
                className="clip-card-image"
                loading="lazy"
                src={clipboardImageUrl(image.id)}
                alt={`clip ${image.id}`}
              />
              <div className="clip-meta">
                <span>{formatType(image.type)}</span>
                <span>{formatBytes(image.bytes)}</span>
                <span>{formatTime(image.createdAt)}</span>
              </div>
              <div className="clip-card-actions">
                <button type="button" className="clip-card-btn" onClick={() => handleCopy(image.id)}>
                  {copiedId === image.id ? '복사됨' : '복사'}
                </button>
                <a className="clip-card-btn" href={clipboardImageUrl(image.id)} target="_blank" rel="noopener noreferrer">
                  원본 열기
                </a>
                <button
                  type="button"
                  className="clip-card-btn clip-card-btn--danger"
                  onClick={() => handleDelete(image.id)}
                  disabled={busyIds.includes(image.id)}
                >
                  삭제
                </button>
              </div>
              {copyError?.id === image.id && <p className="clip-card-error">{copyError.message}</p>}
            </article>
          ))}
        </div>

        {images.length === 0 && !loading && (
          <p className="clip-empty">저장된 이미지가 없습니다. 이미지를 복사한 뒤 Ctrl+V 를 누르세요.</p>
        )}
      </div>
    </div>
  );
}

export default ClipboardImagesPanel;
