import { useState, useRef, useEffect, useCallback } from 'react';
import { renderMarkdown } from '../utils/markdown';
import './MarkdownPreview.css';

function MarkdownPreview({ isOpen, onClose }) {
  const [markdown, setMarkdown] = useState(() => localStorage.getItem('md-preview-content') || '# Hello World\n\nStart typing markdown here...');
  const [wordWrap, setWordWrap] = useState(true);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'preview'
  const textareaRef = useRef(null);
  const previewRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Save to localStorage with debounce
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setMarkdown(val);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem('md-preview-content', val);
    }, 500);
  }, []);

  // Sync scroll
  const handleEditorScroll = useCallback(() => {
    if (!textareaRef.current || !previewRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
    const ratio = scrollTop / (scrollHeight - clientHeight || 1);
    const previewMax = previewRef.current.scrollHeight - previewRef.current.clientHeight;
    previewRef.current.scrollTop = ratio * previewMax;
  }, []);

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Tab key support
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      setMarkdown(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, []);

  const handleClear = () => {
    setMarkdown('');
    localStorage.removeItem('md-preview-content');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="md-header">
          <div className="md-header-left">
            <svg className="md-header-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span className="md-header-title">Markdown Preview</span>
          </div>
          <div className="md-header-actions">
            {/* View Mode Toggle */}
            <div className="md-view-toggle">
              <button className={`md-view-toggle-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')} title="Split view">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" />
                </svg>
              </button>
              <button className={`md-view-toggle-btn ${viewMode === 'preview' ? 'active' : ''}`} onClick={() => setViewMode('preview')} title="Preview only">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
                </svg>
              </button>
            </div>
            <div className="md-action-separator" />
            <button className="md-action-btn" onClick={() => setWordWrap(!wordWrap)} title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
              style={{ display: viewMode === 'split' ? 'flex' : 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ opacity: wordWrap ? 1 : 0.4 }}>
                <line x1="3" y1="6" x2="21" y2="6" /><path d="M3 12h15a3 3 0 1 1 0 6h-4" /><polyline points="16 16 14 18 16 20" /><line x1="3" y1="18" x2="10" y2="18" />
              </svg>
            </button>
            <button className="md-action-btn" onClick={handleCopy} title="Copy markdown">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button className="md-action-btn" onClick={handleClear} title="Clear">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
            <button className="md-close-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={`md-body ${viewMode === 'preview' ? 'md-body--preview' : ''}`}>
          {viewMode === 'split' && (
            <>
              <div className="md-editor-pane">
                <div className="md-pane-label">EDITOR</div>
                <textarea
                  ref={textareaRef}
                  className="md-textarea"
                  value={markdown}
                  onChange={handleChange}
                  onScroll={handleEditorScroll}
                  onKeyDown={handleKeyDown}
                  placeholder="Type markdown here..."
                  spellCheck={false}
                  style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre' }}
                />
              </div>
              <div className="md-divider" />
            </>
          )}
          <div className={`md-preview-pane ${viewMode === 'preview' ? 'md-preview-pane--full' : ''}`}>
            {viewMode === 'split' && <div className="md-pane-label">PREVIEW</div>}
            <div
              ref={previewRef}
              className="md-preview-content md-rendered"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarkdownPreview;
