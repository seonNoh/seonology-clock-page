import { useEffect, useState } from 'react';

import { requestJson } from '../../api/client.js';
import { describeWeatherCode } from './weatherStatus.js';
export { default as GoogleSearch } from './GoogleSearch.jsx';

function useWeatherStatus() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async (latitude, longitude) => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
        const result = await response.json();
        if (active) setWeather({ temperature: Math.round(result.current.temperature_2m), code: result.current.weather_code });
      } catch (error) {
        if (active && error.name !== 'AbortError') setWeather(null);
      }
    };

    const fallback = () => load(37.5665, 126.9780);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => load(coords.latitude, coords.longitude),
        fallback,
        { timeout: 5000, maximumAge: 900000 },
      );
    } else {
      fallback();
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return weather;
}

function useExchangeStatus() {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch('https://api.manana.kr/exchange/rate/KRW/KRW,JPY.json', { signal: controller.signal });
        if (!response.ok) throw new Error(`Exchange request failed: ${response.status}`);
        const result = await response.json();
        const jpy = result.find((item) => item.name === 'JPYKRW=X');
        if (active) setRate(jpy ? (jpy.rate * 100).toFixed(2) : null);
      } catch (error) {
        if (active && error.name !== 'AbortError') setRate(null);
      }
    };
    load();
    const interval = setInterval(load, 300000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return rate;
}

export function StatusSummary({ onOpenWeather, onOpenExchange }) {
  const weather = useWeatherStatus();
  const rate = useExchangeStatus();

  return (
    <div className="split-clock-meta">
      <button type="button" onClick={onOpenWeather}><b>WEATHER</b><span>{weather ? `${weather.temperature}° / ${describeWeatherCode(weather.code)}` : '--° / --'}</span></button>
      <button type="button" onClick={onOpenExchange}><b>EXCHANGE</b><span>₩100 = ¥{rate ?? '--'}</span></button>
      <div><b>TIMEZONE</b><span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></div>
      <div><b>SECONDS</b><span className="split-live-indicator">LIVE</span></div>
    </div>
  );
}

export function BriefingSummary({ onOpen }) {
  const [latest, setLatest] = useState(null);
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await requestJson('/api/briefing/latest');
        if (!active) return;
        setLatest(result);
        let seen = null;
        try { seen = localStorage.getItem('briefing-last-seen-run'); } catch { /* ignore */ }
        if (result.run && result.run.status === 'succeeded' && result.run.id !== seen) setFresh(true);
      } catch {
        if (active) setLatest(null);
      }
    };
    load();
    const interval = setInterval(load, 10 * 60 * 1000);
    const source = new EventSource('/api/briefing/stream');
    source.addEventListener('briefing', (event) => {
      let payload = null;
      try { payload = JSON.parse(event.data); } catch { return; }
      load();
      if (payload && payload.event === 'completed') {
        setFresh(true);
        try {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Morning Briefing', { body: `${payload.target_date} 브리핑이 도착했습니다.` });
          }
        } catch { /* ignore */ }
      }
    });
    source.onerror = () => { /* 브라우저가 자동 재연결 */ };
    return () => {
      active = false;
      clearInterval(interval);
      source.close();
    };
  }, []);

  const open = () => {
    if (latest && latest.run) {
      try { localStorage.setItem('briefing-last-seen-run', latest.run.id); } catch { /* ignore */ }
    }
    setFresh(false);
    try {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    } catch { /* ignore */ }
    onOpen();
  };

  const run = latest?.run;
  const result = latest?.detail?.structured_result;
  const summary = result
    ? `일정 ${(result.schedule_preparation ?? []).length} · 리스크 ${(result.risks ?? []).length} · 결정 ${(result.decisions ?? []).length}`
    : (run ? `${run.status}${run.error_code ? ` (${run.error_code})` : ''}` : '브리핑 없음');

  return (
    <button type="button" className="split-summary-card" onClick={open}>
      <span>BRIEFING{fresh ? ' · NEW' : ''}{run ? ` · ${run.target_date}` : ''}</span>
      <b>{summary}</b>
    </button>
  );
}

export function TodoSummary({ onOpen }) {
  const [pending, setPending] = useState([]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const result = await requestJson('/api/todos', { signal: controller.signal });
        if (active) setPending((result.todos ?? []).filter((todo) => !todo.completed).slice(0, 3));
      } catch (error) {
        if (active && error.name !== 'AbortError') setPending([]);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <button type="button" className="split-summary-card" onClick={onOpen}>
      <span>TODO</span>
      <b>{pending.length ? `${pending.length}개 항목 대기 중` : '대기 중인 항목 없음'}</b>
    </button>
  );
}
