import { clipboardImageUrl } from './clipboardApi.js';
import { formatBytes, formatType } from './clipboardFormat.js';
import { summarizeAdded } from './clipboardSession.js';

function ClipboardAddView({ addedImages, uploadingCount, error }) {
  const { count, bytes } = summarizeAdded(addedImages);

  return (
    <div className="clip-add">
      <div className="clip-paste-target">
        <svg
          className="clip-paste-icon"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <p className="clip-paste-text">
          여기에 Ctrl+V 또는 Cmd+V 로 이미지를 붙여넣으세요. 여러 번 붙여넣으면 계속 추가됩니다.
        </p>
      </div>

      {(uploadingCount > 0 || error) && (
        <div className={`clip-status${error ? ' clip-status--error' : ''}`} role="status">
          {error || `이미지 ${uploadingCount}장을 저장하고 있습니다.`}
        </div>
      )}

      {count > 0 && (
        <>
          <p className="clip-added-summary">{`추가한 이미지 ${count}장 · ${formatBytes(bytes)}`}</p>
          <ul className="clip-added-list">
            {addedImages.map((image) => (
              <li className="clip-added-item" key={image.id}>
                <img
                  className="clip-added-thumb"
                  loading="lazy"
                  src={clipboardImageUrl(image.id)}
                  alt={`clip ${image.id}`}
                />
                <span className="clip-added-meta">
                  <span>{formatType(image.type)}</span>
                  <span>{formatBytes(image.bytes)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default ClipboardAddView;
