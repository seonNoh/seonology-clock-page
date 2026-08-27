import { useState, useEffect } from 'react';
import './BriefingPanel.css';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

const SECTIONS = [
  { key: 'schedule_preparation', label: '오늘 일정 준비' },
  { key: 'risks', label: '리스크' },
  { key: 'action_items', label: '액션 아이템' },
  { key: 'decisions', label: '결정 사항' },
  { key: 'overview', label: '오늘의 흐름' },
  { key: 'unscheduled_work', label: '기타 업무' },
];

function claimChips(item) {
  const labels = (item.temporal_claims || []).map((claim) => claim.label).filter(Boolean);
  return [...new Set(labels)].slice(0, 3);
}

// 전체 브리핑 모달 본문. worklog structured_result(v1)를 섹션별로 렌더한다.
function BriefingPanel() {
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState(null);
  const [openSections, setOpenSections] = useState({ schedule_preparation: true, risks: true, action_items: true, decisions: true });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/briefing/latest`);
        if (!r.ok) { setError(`브리핑을 불러오지 못했습니다 (HTTP ${r.status})`); return; }
        setLatest(await r.json());
      } catch (e) {
        setError(`브리핑을 불러오지 못했습니다: ${String(e.message || e)}`);
      }
    })();
  }, []);

  if (error) return <div className="briefing-panel-message">{error}</div>;
  if (!latest) return <div className="briefing-panel-message">불러오는 중...</div>;
  const run = latest.run;
  if (!run) return <div className="briefing-panel-message">아직 생성된 브리핑이 없습니다.</div>;
  const result = latest.detail && latest.detail.structured_result;

  return (
    <div className="briefing-panel">
      <div className="briefing-panel-head">
        <span className={`briefing-status-dot briefing-status-${run.status === 'succeeded' ? 'ok' : (run.status === 'failed' ? 'bad' : 'pending')}`} />
        <span className="briefing-panel-date">{run.target_date}</span>
        <span className="briefing-panel-meta">mail {run.mail_count} · calendar {run.calendar_count} · {run.trigger} r{run.revision}</span>
        {run.status !== 'succeeded' && (
          <span className="briefing-panel-status">{run.status}{run.error_code ? ` (${run.error_code})` : ''}</span>
        )}
      </div>
      {!result && <div className="briefing-panel-message">이 run 에는 본문이 없습니다.</div>}
      {result && SECTIONS.map(({ key, label }) => {
        const items = result[key] || [];
        if (items.length === 0) return null;
        const opened = !!openSections[key];
        return (
          <div key={key} className="briefing-section">
            <button
              type="button"
              className="briefing-section-header"
              onClick={() => setOpenSections((prev) => ({ ...prev, [key]: !opened }))}
            >
              <span className={`briefing-section-caret${opened ? ' open' : ''}`}>&#9656;</span>
              <span className="briefing-section-label">{label}</span>
              <span className="briefing-section-count">{items.length}</span>
            </button>
            {opened && (
              <ul className="briefing-items">
                {items.map((item, index) => (
                  <li key={item.analysis_item_id || `${key}-${index}`} className="briefing-item">
                    <span className="briefing-item-text">{item.text}</span>
                    {claimChips(item).length > 0 && (
                      <span className="briefing-item-chips">
                        {claimChips(item).map((chip) => (
                          <span key={chip} className="briefing-chip">{chip}</span>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default BriefingPanel;
