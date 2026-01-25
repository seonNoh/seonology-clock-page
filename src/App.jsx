import { useState, useEffect } from 'react';
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Thermometer } from 'lucide-react';
import Clock from './components/Clock';
import Weather from './components/Weather';
import TodoList from './components/TodoList';
import Calendar from './components/Calendar';
import ExchangeRate from './components/ExchangeRate';
import Fortune from './components/Fortune';
import TodayInHistory from './components/TodayInHistory';
import './App.css';

// Weather widget - centered top
function WeatherWidget({ onClick }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
        );
        const result = await res.json();
        setData({
          temp: Math.round(result.current.temperature_2m),
          code: result.current.weather_code,
        });
      } catch {
        setData(null);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(37.5665, 126.9780)
      );
    } else {
      fetchWeather(37.5665, 126.9780);
    }
  }, []);

  const getIcon = (code) => {
    const iconProps = { size: 48, strokeWidth: 1.5 };
    if (code === 0) return <Sun {...iconProps} />;
    if (code <= 3) return <CloudSun {...iconProps} />;
    if (code <= 48) return <CloudFog {...iconProps} />;
    if (code <= 67) return <CloudRain {...iconProps} />;
    if (code <= 77) return <CloudSnow {...iconProps} />;
    if (code <= 82) return <CloudRain {...iconProps} />;
    return <CloudLightning {...iconProps} />;
  };

  return (
    <div className="top-widget weather-widget" onClick={onClick}>
      <span className="widget-icon">{data ? getIcon(data.code) : <Cloud size={48} strokeWidth={1.5} />}</span>
      <span className="widget-text">{data ? `${data.temp}°` : '--°'}</span>
    </div>
  );
}

// Exchange rate widget - centered top
function ExchangeWidget({ onClick }) {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/KRW');
        const data = await res.json();
        const jpyPer100Krw = (data.rates.JPY * 100).toFixed(2);
        setRate(jpyPer100Krw);
      } catch {
        setRate(null);
      }
    };
    fetchRate();
  }, []);

  return (
    <div className="top-widget exchange-widget" onClick={onClick}>
      <span className="widget-text">₩100 = ¥{rate || '--'}</span>
    </div>
  );
}

// Todo preview in bottom-left
function TodoPreview({ onClick }) {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const checkTodos = () => {
      const saved = localStorage.getItem('seonology-todos');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Show up to 3 pending todos
          const pending = parsed.filter(t => !t.completed).slice(0, 3);
          setTodos(pending);
        } catch {
          setTodos([]);
        }
      }
    };
    checkTodos();
    window.addEventListener('storage', checkTodos);
    const interval = setInterval(checkTodos, 2000); // Check every 2 seconds
    return () => {
      window.removeEventListener('storage', checkTodos);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="todo-preview" onClick={onClick}>
      <div className="todo-preview-header">
        <span className="todo-icon">☐</span>
        <span className="todo-title">Todo</span>
        {todos.length > 0 && <span className="todo-count">{todos.length}</span>}
      </div>
      {todos.length > 0 ? (
        <div className="todo-preview-list">
          {todos.map((todo, i) => (
            <div key={i} className="todo-preview-item">
              <span className="todo-bullet">•</span>
              <span className="todo-text">{todo.text.length > 25 ? todo.text.slice(0, 25) + '...' : todo.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="todo-preview-empty">할 일 없음</div>
      )}
    </div>
  );
}

// Calendar icon
function CalendarIcon({ onClick }) {
  const today = new Date();
  return (
    <div className="ambient-item calendar-item" onClick={onClick}>
      <span className="ambient-symbol">◰</span>
      <span className="ambient-value">{today.getDate()}</span>
    </div>
  );
}

// Fortune display - blends naturally
function FortuneDisplay({ onClick }) {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rand = Math.sin(seed) * 10000;
  const score = Math.floor((rand - Math.floor(rand)) * 40) + 60;

  const getSymbol = (s) => {
    if (s >= 90) return '★';
    if (s >= 80) return '☆';
    if (s >= 70) return '◆';
    return '◇';
  };

  return (
    <div className="ambient-item fortune-item" onClick={onClick}>
      <span className="ambient-symbol">{getSymbol(score)}</span>
      <span className="ambient-value">luck {score}</span>
    </div>
  );
}

// History display - now centered below clock (Korean first, English fallback)
function HistoryDisplay({ onClick }) {
  const [event, setEvent] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      // Try Korean Wikipedia first
      try {
        const koRes = await fetch(
          `https://api.wikimedia.org/feed/v1/wikipedia/ko/onthisday/events/${month}/${day}`
        );
        if (koRes.ok) {
          const koData = await koRes.json();
          if (koData.events && koData.events.length > 0) {
            const randomEvent = koData.events[Math.floor(Math.random() * Math.min(5, koData.events.length))];
            setEvent({
              year: randomEvent.year,
              text: randomEvent.text.length > 80
                ? randomEvent.text.substring(0, 80) + '...'
                : randomEvent.text
            });
            return;
          }
        }
      } catch {
        // Korean API failed, try English
      }

      // Fallback to English Wikipedia
      try {
        const enRes = await fetch(
          `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`
        );
        const enData = await enRes.json();
        if (enData.events && enData.events.length > 0) {
          const randomEvent = enData.events[Math.floor(Math.random() * Math.min(5, enData.events.length))];
          setEvent({
            year: randomEvent.year,
            text: randomEvent.text.length > 80
              ? randomEvent.text.substring(0, 80) + '...'
              : randomEvent.text
          });
        }
      } catch {
        setEvent(null);
      }
    };
    fetchHistory();
  }, []);

  if (!event) return null;

  return (
    <div className="history-center" onClick={onClick}>
      <span className="history-year">{event.year}</span>
      <span className="history-text">{event.text}</span>
    </div>
  );
}

// Modal component
function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="dashboard">
      {/* Top Center - Weather & Exchange */}
      <div className="top-center-bar">
        <WeatherWidget onClick={() => openModal('weather')} />
        <div className="bar-divider"></div>
        <ExchangeWidget onClick={() => openModal('exchange')} />
      </div>

      {/* Main Clock */}
      <main className="main-content">
        <Clock />
        <HistoryDisplay onClick={() => openModal('history')} />
      </main>

      {/* Bottom Left - Todo Preview */}
      <TodoPreview onClick={() => openModal('todo')} />

      {/* Bottom Right - Calendar & Fortune */}
      <div className="ambient-info">
        <CalendarIcon onClick={() => openModal('calendar')} />
        <FortuneDisplay onClick={() => openModal('fortune')} />
      </div>

      {/* Modals */}
      <Modal isOpen={activeModal === 'weather'} onClose={closeModal} title="Weather">
        <Weather />
      </Modal>

      <Modal isOpen={activeModal === 'exchange'} onClose={closeModal} title="Exchange Rate">
        <ExchangeRate />
      </Modal>

      <Modal isOpen={activeModal === 'todo'} onClose={closeModal} title="Todo">
        <TodoList />
      </Modal>

      <Modal isOpen={activeModal === 'calendar'} onClose={closeModal} title="Calendar">
        <Calendar />
      </Modal>

      <Modal isOpen={activeModal === 'fortune'} onClose={closeModal} title="Fortune">
        <Fortune />
      </Modal>

      <Modal isOpen={activeModal === 'history'} onClose={closeModal} title="On This Day">
        <TodayInHistory />
      </Modal>
    </div>
  );
}

export default App;
