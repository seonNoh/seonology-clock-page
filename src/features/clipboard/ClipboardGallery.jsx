import { clipboardImageUrl } from './clipboardApi.js';
import { formatBytes, formatTime, formatType, formatUsage } from './clipboardFormat.js';

function ClipboardGallery({
  images,
  totalBytes,
  limits,
  loading,
  error,
  copiedId,
  copyError,
  busyIds,
  onCopy,
  onDelete,
}) {
  return (
    <>
      <p className="clip-hint">{formatUsage({ totalBytes, count: images.length, limits })}</p>

      {(loading || error) && (
        <div className={`clip-status${error ? ' clip-status--error' : ''}`} role="status">
          {error || '목록을 불러오고 있습니다.'}
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
              <button type="button" className="clip-card-btn" onClick={() => onCopy(image.id)}>
                {copiedId === image.id ? '복사됨' : '복사'}
              </button>
              <a className="clip-card-btn" href={clipboardImageUrl(image.id)} target="_blank" rel="noopener noreferrer">
                원본 열기
              </a>
              <button
                type="button"
                className="clip-card-btn clip-card-btn--danger"
                onClick={() => onDelete(image.id)}
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
        <p className="clip-empty">저장된 이미지가 없습니다. 추가 버튼을 눌러 이미지를 붙여넣으세요.</p>
      )}
    </>
  );
}

export default ClipboardGallery;
