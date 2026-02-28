import { useState, useEffect } from 'react';
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react';
import Clock from './components/Clock';
import Weather from './components/Weather';
import TodoList from './components/TodoList';
import Calendar from './components/Calendar';
import ExchangeRate from './components/ExchangeRate';
import './App.css';

// Import version from VERSION file (will be replaced at build time)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Weather widget - centered top (auto-refresh every 5 minutes)
function WeatherWidget({ onClick }) {
  const [data, setData] = useState(null);
  const [coords, setCoords] = useState(null);

  // Initialize location once
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          setCoords({ lat: 37.5665, lon: 126.9780 });
        }
      );
    } else {
      setCoords({ lat: 37.5665, lon: 126.9780 });
    }
  }, []);

  // Fetch weather when coords are available and set up interval
  useEffect(() => {
    if (!coords) return;

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code`
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

    // Fetch immediately
    fetchWeather();

    // Auto-refresh every 5 minutes (300000ms)
    const interval = setInterval(fetchWeather, 300000);

    return () => clearInterval(interval);
  }, [coords]);

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

// Exchange rate widget - centered top (auto-refresh every 5 minutes)
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

    // Auto-refresh every 5 minutes (300000ms)
    const interval = setInterval(fetchRate, 300000);

    return () => clearInterval(interval);
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

// Footer component
function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-text">
          Craft by seon (
          <a href="mailto:dark.pearl.nst@gmail.com" className="footer-link">
            dark.pearl.nst@gmail.com
          </a>
          )
        </span>
        <span className="footer-divider">|</span>
        <span className="footer-text">React + Vite</span>
        <span className="footer-divider">|</span>
        <span className="footer-text">v{APP_VERSION}</span>
      </div>
    </footer>
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
      </main>

      {/* Bottom Left - Todo Preview */}
      <TodoPreview onClick={() => openModal('todo')} />

      {/* Bottom Right - Calendar */}
      <div className="ambient-info">
        <CalendarIcon onClick={() => openModal('calendar')} />
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

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
