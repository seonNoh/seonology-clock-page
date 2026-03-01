import { useState, useEffect } from 'react';
import './BrowserStats.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

function BrowserStats() {
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/browser-stats`);
        const data = await res.json();
        if (data.available) {
          setStats(data);
        } else {
          setStats(null);
        }
      } catch {
        setStats(null);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const { tabs, windows, memory } = stats;

  const formatBytes = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)}GB`;
  };

  return (
    <div className="browser-stats-wrapper">
      <div className="browser-stats-mini" onClick={() => setExpanded(!expanded)}>
        <span className="stats-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </span>
        <span className="stats-tabs">{tabs.total}</span>
        <span className="stats-label">tabs</span>
        {memory && (
          <>
            <span className="stats-sep">·</span>
            <span className={`stats-mem ${memory.usedPercent > 80 ? 'high' : memory.usedPercent > 60 ? 'mid' : ''}`}>
              {memory.usedPercent}%
            </span>
          </>
        )}
      </div>

      {expanded && (
        <div className="browser-stats-detail">
          <div className="stats-detail-header">Browser Stats</div>
          <div className="stats-detail-grid">
            <div className="stats-detail-item">
              <span className="stats-detail-value">{tabs.total}</span>
              <span className="stats-detail-label">Total Tabs</span>
            </div>
            <div className="stats-detail-item">
              <span className="stats-detail-value">{windows}</span>
              <span className="stats-detail-label">Windows</span>
            </div>
            {memory && (
              <>
                <div className="stats-detail-item">
                  <span className={`stats-detail-value ${memory.usedPercent > 80 ? 'high' : memory.usedPercent > 60 ? 'mid' : ''}`}>
                    {memory.usedPercent}%
                  </span>
                  <span className="stats-detail-label">Memory Used</span>
                </div>
                <div className="stats-detail-item">
                  <span className="stats-detail-value">
                    {formatBytes(memory.totalBytes - memory.availableBytes)}
                  </span>
                  <span className="stats-detail-label">
                    / {formatBytes(memory.totalBytes)}
                  </span>
                </div>
              </>
            )}
          </div>

          {tabs.byWindow && tabs.byWindow.length > 1 && (
            <div className="stats-window-list">
              <div className="stats-window-title">Tabs per Window</div>
              {tabs.byWindow.map((w, i) => (
                <div key={w.windowId} className="stats-window-row">
                  <span className="stats-window-icon">◻</span>
                  <span className="stats-window-name">Window {i + 1}</span>
                  <span className="stats-window-count">{w.count}</span>
                </div>
              ))}
            </div>
          )}

          {memory && (
            <div className="stats-mem-bar">
              <div
                className={`stats-mem-fill ${memory.usedPercent > 80 ? 'high' : memory.usedPercent > 60 ? 'mid' : ''}`}
                style={{ width: `${memory.usedPercent}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BrowserStats;
