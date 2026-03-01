import { useState, useEffect, useRef } from 'react';
import { Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog } from 'lucide-react';
import Clock from './components/Clock';
import CursorCanvas from './components/CursorCanvas';
import Weather from './components/Weather';
import TodoList from './components/TodoList';
import Calendar from './components/Calendar';
import ExchangeRate from './components/ExchangeRate';
import NotesPanel from './components/NotesPanel';
import './App.css';

// Import version from VERSION file (will be replaced at build time)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Services will be loaded from API

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

    // Auto-refresh every 15 minutes (900000ms)
    const interval = setInterval(fetchWeather, 900000);

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
        const res = await fetch('https://api.manana.kr/exchange/rate/KRW/KRW,JPY.json');
        const data = await res.json();
        const jpyEntry = data.find(item => item.name === 'JPYKRW=X');
        if (jpyEntry) {
          const jpyPer100Krw = (jpyEntry.rate * 100).toFixed(2);
          setRate(jpyPer100Krw);
        }
      } catch {
        setRate(null);
      }
    };

    fetchRate();

    // Auto-refresh every 5 minutes (300000ms) - real-time API
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
    const fetchTodos = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/todos`);
        const data = await res.json();
        const pending = (data.todos || []).filter(t => !t.completed).slice(0, 3);
        setTodos(pending);
      } catch {
        setTodos([]);
      }
    };
    fetchTodos();
    const interval = setInterval(fetchTodos, 5000);
    return () => clearInterval(interval);
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

// Service icon SVGs
function VaultIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="16" width="40" height="36" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="32" cy="34" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="32" y1="34" x2="38" y2="34" stroke="currentColor" strokeWidth="2"/>
      <line x1="32" y1="34" x2="32" y2="40" stroke="currentColor" strokeWidth="2"/>
      <rect x="28" y="10" width="8" height="6" fill="currentColor"/>
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="20" cy="32" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="26" y1="28" x2="48" y2="28" stroke="currentColor" strokeWidth="2"/>
      <rect x="40" y="24" width="4" height="8" fill="currentColor"/>
      <rect x="46" y="24" width="4" height="8" fill="currentColor"/>
    </svg>
  );
}

function GitOpsIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M16 32 L32 16 L48 32" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M32 16 L32 48" stroke="currentColor" strokeWidth="2"/>
      <circle cx="32" cy="48" r="4" fill="currentColor"/>
      <circle cx="16" cy="32" r="4" fill="currentColor"/>
      <circle cx="48" cy="32" r="4" fill="currentColor"/>
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="8" y="12" width="48" height="40" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M16 24 L24 32 L16 40" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="28" y1="40" x2="44" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="32" y1="32" x2="32" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="32" y1="32" x2="42" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="32" r="2" fill="currentColor"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="36" width="8" height="16" fill="currentColor"/>
      <rect x="24" y="28" width="8" height="24" fill="currentColor"/>
      <rect x="36" y="20" width="8" height="32" fill="currentColor"/>
      <rect x="48" y="32" width="8" height="20" fill="currentColor"/>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M8 32 L16 32 L24 16 L32 48 L40 24 L48 32 L56 32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PortalIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="32" cy="32" r="12" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="32" cy="32" r="4" fill="currentColor"/>
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M16 12 L48 12 L48 52 L16 52 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="24" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="32" x2="40" y2="32" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="40" x2="32" y2="40" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="16" width="40" height="28" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M24 44 L32 52 L32 44" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="20" y1="28" x2="44" y2="28" stroke="currentColor" strokeWidth="2"/>
      <line x1="20" y1="36" x2="36" y2="36" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="16" y="12" width="32" height="40" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="24" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="32" x2="40" y2="32" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="40" x2="32" y2="40" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M24 20 L12 32 L24 44" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M40 20 L52 32 L40 44" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="36" y1="16" x2="28" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M16 12 L16 52 L32 44 L48 52 L48 12 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="32" y1="12" x2="32" y2="44" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M12 20 L12 48 L52 48 L52 24 L32 24 L28 20 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function K8sIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M32 12 L48 24 L48 40 L32 52 L16 40 L16 24 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="32" y1="24" x2="32" y2="16" stroke="currentColor" strokeWidth="2"/>
      <line x1="32" y1="40" x2="32" y2="48" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M12 16 L24 12 L40 20 L52 16 L52 48 L40 52 L24 44 L12 48 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="24" y1="12" x2="24" y2="44" stroke="currentColor" strokeWidth="2"/>
      <line x1="40" y1="20" x2="40" y2="52" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function StorageIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="16" width="40" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="12" y="32" width="40" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="22" r="2" fill="currentColor"/>
      <circle cx="20" cy="38" r="2" fill="currentColor"/>
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M24 40 L24 20 L44 16 L44 36" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="20" cy="44" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="40" cy="40" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="24" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M16 52 C16 42 22 36 32 36 C42 36 48 42 48 52" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M20 12 L44 12 L52 20 L52 52 L20 52 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M44 12 L44 20 L52 20" stroke="currentColor" strokeWidth="2" fill="none"/>
      <text x="32" y="38" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600">PDF</text>
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="16" width="40" height="32" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="24" cy="28" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M12 40 L24 28 L36 40 L48 28 L52 32" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="20" cy="32" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="44" cy="20" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="44" cy="44" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="25" y1="30" x2="39" y2="22" stroke="currentColor" strokeWidth="2"/>
      <line x1="25" y1="34" x2="39" y2="42" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="16" y="12" width="32" height="40" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M24 24 L28 28 L36 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="24" y1="36" x2="40" y2="36" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="44" x2="40" y2="44" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M20 40 C14 40 10 36 10 30 C10 24 14 20 20 20 C20 14 26 10 32 10 C38 10 44 14 44 20 C50 20 54 24 54 30 C54 36 50 40 44 40 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function WikiIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="16" y="12" width="32" height="40" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="24" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="32" x2="40" y2="32" stroke="currentColor" strokeWidth="2"/>
      <line x1="24" y1="40" x2="36" y2="40" stroke="currentColor" strokeWidth="2"/>
      <circle cx="44" cy="44" r="8" fill="currentColor"/>
      <text x="44" y="48" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">W</text>
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="12" y="12" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="40" y="12" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="26" y="40" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M24 18 L32 18 L32 40" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M40 18 L32 18" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M12 32 L32 12 L52 32 L52 52 L12 52 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <rect x="28" y="36" width="8" height="16" fill="currentColor"/>
    </svg>
  );
}

function DefaultIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="16" y="16" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
  );
}

// Icon resolver (shared by ServiceIcon and BookmarksPanel)
function getIconByName(iconName) {
  switch (iconName) {
    case 'vault': return <VaultIcon />;
    case 'key': return <KeyIcon />;
    case 'gitops': return <GitOpsIcon />;
    case 'terminal': return <TerminalIcon />;
    case 'clock': return <ClockIcon />;
    case 'chart': return <ChartIcon />;
    case 'activity': return <ActivityIcon />;
    case 'portal': return <PortalIcon />;
    case 'note': return <NoteIcon />;
    case 'chat': return <ChatIcon />;
    case 'content': return <ContentIcon />;
    case 'code': return <CodeIcon />;
    case 'book': return <BookIcon />;
    case 'folder': return <FolderIcon />;
    case 'k8s': return <K8sIcon />;
    case 'map': return <MapIcon />;
    case 'storage': return <StorageIcon />;
    case 'music': return <MusicIcon />;
    case 'user': return <UserIcon />;
    case 'pdf': return <PdfIcon />;
    case 'photo': return <PhotoIcon />;
    case 'share': return <ShareIcon />;
    case 'task': return <TaskIcon />;
    case 'cloud': return <CloudIcon />;
    case 'wiki': return <WikiIcon />;
    case 'workflow': return <WorkflowIcon />;
    case 'home': return <HomeIcon />;
    default: return <DefaultIcon />;
  }
}

// Service icon component
function ServiceIcon({ service }) {
  
  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="service-card"
      style={{ '--service-color': service.color }}
    >
      <div className="service-icon">
        {getIconByName(service.icon)}
      </div>
      <div className="service-info">
        <div className="service-name">{service.name}</div>
        <div className="service-desc">{service.description}</div>
      </div>
    </a>
  );
}

// Services modal content
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

// Bookmarks panel
const RANDOM_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1',
];
const randomColor = () => RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];

function BookmarksPanel() {
  const [data, setData] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [addingTo, setAddingTo] = useState(null); // categoryId for add form
  const [newCatName, setNewCatName] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', icon: 'default', color: randomColor(), quickLink: false });

  const fetchBookmarks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookmarks`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookmarks(); }, []);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await fetch(`${API_BASE}/api/bookmarks/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName.trim() }),
    });
    setNewCatName('');
    setShowAddCat(false);
    fetchBookmarks();
  };

  const deleteCategory = async (catId) => {
    await fetch(`${API_BASE}/api/bookmarks/categories/${catId}`, { method: 'DELETE' });
    fetchBookmarks();
  };

  const addBookmark = async (catId) => {
    if (!form.name.trim() || !form.url.trim()) return;
    let url = form.url.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    await fetch(`${API_BASE}/api/bookmarks/categories/${catId}/bookmarks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, url }),
    });
    setForm({ name: '', url: '', icon: 'default', color: randomColor(), quickLink: false });
    setAddingTo(null);
    fetchBookmarks();
  };

  const deleteBookmark = async (catId, bmId) => {
    await fetch(`${API_BASE}/api/bookmarks/categories/${catId}/bookmarks/${bmId}`, { method: 'DELETE' });
    fetchBookmarks();
  };

  const toggleQuickLink = async (catId, bm) => {
    await fetch(`${API_BASE}/api/bookmarks/categories/${catId}/bookmarks/${bm.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quickLink: !bm.quickLink }),
    });
    fetchBookmarks();
  };

  if (loading) return <div className="services-loading">Loading bookmarks...</div>;

  return (
    <div className="bookmarks-panel">
      <div className="bookmarks-toolbar">
        <button className="bm-toolbar-btn" onClick={() => setEditMode(!editMode)}>
          {editMode ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</>
          )}
        </button>
        {editMode && (
          <button className="bm-toolbar-btn bm-add-cat-btn" onClick={() => setShowAddCat(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Category
          </button>
        )}
      </div>

      {showAddCat && (
        <div className="bm-add-cat-form">
          <input
            className="bm-input"
            placeholder="Category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            autoFocus
          />
          <button className="bm-btn-save" onClick={addCategory}>Add</button>
          <button className="bm-btn-cancel" onClick={() => { setShowAddCat(false); setNewCatName(''); }}>Cancel</button>
        </div>
      )}

      {data.categories.length === 0 && !showAddCat && (
        <div className="bm-empty">
          No bookmarks yet. Click Edit to add categories and bookmarks.
        </div>
      )}

      {data.categories.map(cat => (
        <div key={cat.id} className="bm-category">
          <div className="bm-category-header">
            <h3 className="bm-category-name">{cat.name}</h3>
            <div className="bm-category-actions">
              {editMode && (
                <>
                  <button className="bm-icon-btn" onClick={() => { setAddingTo(cat.id); setForm({ name: '', url: '', icon: 'default', color: randomColor(), quickLink: false }); }} title="Add bookmark">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <button className="bm-icon-btn bm-icon-btn-danger" onClick={() => deleteCategory(cat.id)} title="Delete category">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {addingTo === cat.id && (
            <div className="bm-add-form">
              <input className="bm-input" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
              <input className="bm-input" placeholder="URL" value={form.url} onChange={e => setForm({...form, url: e.target.value})} onKeyDown={e => e.key === 'Enter' && addBookmark(cat.id)} />
              <div className="bm-form-row">
                <label className="bm-label">Color</label>
                <input type="color" className="bm-color-input" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                <label className="bm-quicklink-check">
                  <input type="checkbox" checked={form.quickLink} onChange={e => setForm({...form, quickLink: e.target.checked})} />
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Quick Link
                </label>
                <button className="bm-btn-save" onClick={() => addBookmark(cat.id)}>Add</button>
                <button className="bm-btn-cancel" onClick={() => setAddingTo(null)}>Cancel</button>
              </div>
            </div>
          )}

          {cat.bookmarks.length > 0 ? (
            <div className="bm-grid">
              {cat.bookmarks.map(bm => (
                <div key={bm.id} className={`bm-card${bm.quickLink ? ' bm-card-quicklink' : ''}`} style={{ '--bm-color': bm.color }}>
                  <a href={bm.url} target="_blank" rel="noopener noreferrer" className="bm-card-link">
                    <div className="bm-card-icon">
                      {getIconByName(bm.icon)}
                    </div>
                    <div className="bm-card-info">
                      <span className="bm-card-name">{bm.name}</span>
                      <span className="bm-card-url">{bm.url.replace(/^https?:\/\//, '').slice(0, 30)}</span>
                    </div>
                  </a>
                  {bm.quickLink && !editMode && (
                    <span className="bm-quicklink-badge" title="Quick Link">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </span>
                  )}
                  {editMode && (
                    <>
                      <button className={`bm-quicklink-toggle${bm.quickLink ? ' active' : ''}`} onClick={() => toggleQuickLink(cat.id, bm)} title={bm.quickLink ? 'Remove from Quick Links' : 'Add to Quick Links'}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={bm.quickLink ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      </button>
                      <button className="bm-delete-btn" onClick={() => deleteBookmark(cat.id, bm.id)} title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bm-empty-cat">No bookmarks in this category</div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuickLinksPanel({ isOpen, onClose }) {
  const [quickLinks, setQuickLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuickLinks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookmarks`);
      const data = await res.json();
      const links = [];
      (data.categories || []).forEach(cat => {
        (cat.bookmarks || []).forEach(bm => {
          if (bm.quickLink) links.push(bm);
        });
      });
      setQuickLinks(links);
    } catch (err) {
      console.error('Failed to fetch quick links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchQuickLinks();
  }, [isOpen]);

  return (
    <div className={`quicklinks-panel${isOpen ? ' open' : ''}`}>
      <div className="quicklinks-header">
        <div className="quicklinks-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Quick Links
        </div>
        <button className="quicklinks-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="quicklinks-list">
        {loading && <div className="quicklinks-empty">Loading...</div>}
        {!loading && quickLinks.length === 0 && (
          <div className="quicklinks-empty">
            No quick links yet.<br/>
            <span className="quicklinks-hint">Mark bookmarks as Quick Link in the Bookmarks panel.</span>
          </div>
        )}
        {quickLinks.map(bm => (
          <a key={bm.id} href={bm.url} target="_blank" rel="noopener noreferrer" className="quicklink-item" style={{ '--ql-color': bm.color }}>
            <div className="quicklink-icon">
              {getIconByName(bm.icon)}
            </div>
            <div className="quicklink-info">
              <span className="quicklink-name">{bm.name}</span>
              <span className="quicklink-url">{bm.url.replace(/^https?:\/\//, '').slice(0, 28)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const suggestTimer = useRef(null);
  const wrapperRef = useRef(null);

  const fetchSuggestions = (q) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!q.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/suggest?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.slice(0, 8));
        setShowSuggestions(data.length > 0);
        setSelectedIndex(-1);
      } catch { setSuggestions([]); }
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = (text) => {
    if (!text.trim()) return;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(text.trim())}`, '_blank');
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(query);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      doSearch(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="search-bar-wrapper" ref={wrapperRef}>
      <form className="search-bar" onSubmit={handleSearch}>
        <svg className="search-bar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="search-bar-input"
          type="text"
          placeholder="Search Google..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); fetchSuggestions(e.target.value); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        />
        {query && (
          <button type="button" className="search-bar-clear" onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className={`search-suggestion-item${i === selectedIndex ? ' selected' : ''}`}
              onClick={() => doSearch(s)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <svg className="suggest-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span className="suggest-text">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesModal() {
  const [tab, setTab] = useState('services');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/services`);
        const data = await res.json();
        setServices(data.services || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch services:', err);
        setError('Failed to load services');
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return (
    <div className="services-modal-wrapper">
      <div className="services-tabs">
        <button className={`services-tab${tab === 'services' ? ' active' : ''}`} onClick={() => setTab('services')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Services
        </button>
        <button className={`services-tab${tab === 'bookmarks' ? ' active' : ''}`} onClick={() => setTab('bookmarks')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          Bookmarks
        </button>
      </div>

      {tab === 'services' && (
        loading ? <div className="services-loading">Loading services...</div> :
        error ? <div className="services-error">{error}</div> :
        <div className="services-grid">
          {services.map((service) => (
            <ServiceIcon key={service.id} service={service} />
          ))}
        </div>
      )}

      {tab === 'bookmarks' && <BookmarksPanel />}
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

const CURSOR_EFFECTS = [
  { id: 'indigo', name: 'Indigo', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(99, 102, 241, 0.15) 0%, rgba(129, 140, 248, 0.06) 30%, transparent 70%)` },
  { id: 'aurora', name: 'Aurora', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(56, 189, 248, 0.12) 0%, rgba(167, 139, 250, 0.08) 25%, rgba(251, 113, 133, 0.05) 50%, transparent 70%)` },
  { id: 'spotlight', name: 'Spotlight', gradient: (x, y) => `radial-gradient(350px circle at ${x}% ${y}%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 40%, transparent 60%)` },
  { id: 'warm', name: 'Warm', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(251, 146, 60, 0.14) 0%, rgba(245, 158, 11, 0.05) 30%, transparent 70%)` },
  { id: 'neon', name: 'Neon', gradient: (x, y) => `radial-gradient(500px circle at ${x}% ${y}%, rgba(0, 255, 65, 0.12) 0%, rgba(0, 255, 65, 0.04) 30%, transparent 65%)` },
  { id: 'ocean', name: 'Ocean', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(6, 182, 212, 0.14) 0%, rgba(59, 130, 246, 0.06) 35%, transparent 70%)` },
  { id: 'sunset', name: 'Sunset', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(249, 115, 22, 0.13) 0%, rgba(236, 72, 153, 0.07) 30%, transparent 70%)` },
  { id: 'rose', name: 'Rose', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(244, 63, 94, 0.14) 0%, rgba(251, 113, 133, 0.05) 30%, transparent 70%)` },
  { id: 'emerald', name: 'Emerald', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(16, 185, 129, 0.14) 0%, rgba(52, 211, 153, 0.05) 30%, transparent 70%)` },
  { id: 'cosmic', name: 'Cosmic', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(139, 92, 246, 0.16) 0%, rgba(88, 28, 135, 0.06) 30%, transparent 70%)` },
  { id: 'fire', name: 'Fire', gradient: (x, y) => `radial-gradient(500px circle at ${x}% ${y}%, rgba(239, 68, 68, 0.14) 0%, rgba(249, 115, 22, 0.07) 25%, rgba(234, 179, 8, 0.03) 50%, transparent 65%)` },
  { id: 'ice', name: 'Ice', gradient: (x, y) => `radial-gradient(600px circle at ${x}% ${y}%, rgba(165, 243, 252, 0.14) 0%, rgba(103, 232, 249, 0.05) 30%, transparent 70%)` },
  { id: 'glow-none', name: 'None', gradient: () => 'none' },
];

const ANIM_EFFECTS = [
  { id: 'none', name: 'None', color: 'transparent' },
  { id: 'trail', name: 'Trail', color: '#818cf8' },
  { id: 'comet', name: 'Comet', color: '#f59e0b' },
  { id: 'particles', name: 'Particles', color: '#ec4899' },
  { id: 'ripple', name: 'Ripple', color: '#6366f1' },
  { id: 'fireflies', name: 'Fireflies', color: '#fbbf24' },
  { id: 'bubbles', name: 'Bubbles', color: '#38bdf8' },
  { id: 'stardust', name: 'Stardust', color: '#c084fc' },
  { id: 'snow', name: 'Snow', color: '#e2e8f0' },
  { id: 'magnetic', name: 'Magnetic', color: '#6366f1' },
  { id: 'constellation', name: 'Constellation', color: '#818cf8' },
  { id: 'wave', name: 'Wave', color: '#06b6d4' },
  { id: 'spotlight', name: 'Spotlight', color: '#ffffff' },
];

function App() {
  const [activeModal, setActiveModal] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [cursorEffect, setCursorEffect] = useState(() => localStorage.getItem('clock-cursor-effect') || 'indigo');
  const [cursorAnim, setCursorAnim] = useState(() => localStorage.getItem('clock-cursor-anim') || 'none');
  const [showGlowPicker, setShowGlowPicker] = useState(false);
  const [showAnimPicker, setShowAnimPicker] = useState(false);

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showQuickLinks) setShowQuickLinks(false);
        else if (showNotes) setShowNotes(false);
        else closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showNotes]);

  useEffect(() => { localStorage.setItem('clock-cursor-effect', cursorEffect); }, [cursorEffect]);
  useEffect(() => { localStorage.setItem('clock-cursor-anim', cursorAnim); }, [cursorAnim]);

  useEffect(() => {
    let raf;
    const handleMouse = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setMousePos({
          x: (e.clientX / window.innerWidth) * 100,
          y: (e.clientY / window.innerHeight) * 100,
        });
        raf = null;
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const currentEffect = CURSOR_EFFECTS.find(e => e.id === cursorEffect) || CURSOR_EFFECTS[0];

  return (
    <div className={`dashboard-wrapper${showQuickLinks ? ' quicklinks-open' : ''}`}>
      <QuickLinksPanel isOpen={showQuickLinks} onClose={() => setShowQuickLinks(false)} />
    <div className="dashboard">
      <div
        className="cursor-glow"
        style={{
          background: currentEffect.gradient(mousePos.x, mousePos.y),
        }}
      />
      <CursorCanvas effect={cursorAnim} />

      {/* Bottom Right Stack */}
      <div className="bottom-right-stack">

      {/* Calendar */}
      <div className="ambient-info">
        <CalendarIcon onClick={() => openModal('calendar')} />
      </div>

      {/* Notes trigger */}
      <button className="notes-trigger" onClick={() => setShowNotes(true)}>
        <span className="notes-trigger-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </span>
        Notes
      </button>

      {/* Cursor Effect Pickers */}
      <div className="glow-picker-area">
        <div className="glow-picker-buttons">
          <button className="glow-picker-btn" onClick={() => { setShowAnimPicker(!showAnimPicker); setShowGlowPicker(false); }} title="Cursor animation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
          </button>
          <button className="glow-picker-btn" onClick={() => { setShowGlowPicker(!showGlowPicker); setShowAnimPicker(false); }} title="Glow color">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </button>
        </div>
        {showGlowPicker && (
          <div className="glow-picker-dropdown">
            <div className="glow-picker-label">Glow Color</div>
            {CURSOR_EFFECTS.map(e => (
              <button
                key={e.id}
                className={`glow-option${cursorEffect === e.id ? ' active' : ''}`}
                onClick={() => { setCursorEffect(e.id); setShowGlowPicker(false); }}
              >
                <span className={`glow-swatch glow-swatch-${e.id}`} />
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        )}
        {showAnimPicker && (
          <div className="glow-picker-dropdown">
            <div className="glow-picker-label">Animation</div>
            {ANIM_EFFECTS.map(e => (
              <button
                key={e.id}
                className={`glow-option${cursorAnim === e.id ? ' active' : ''}`}
                onClick={() => { setCursorAnim(e.id); setShowAnimPicker(false); }}
              >
                <span className="glow-swatch" style={{ background: e.color, border: e.id === 'none' ? '1px solid rgba(255,255,255,0.2)' : 'none' }} />
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      </div>{/* end bottom-right-stack */}

      {/* Top Left - SEONOLOGY Title */}
      <div className="top-left-bar">
        <button className="seonology-btn" onClick={() => openModal('services')}>
          <span className="seonology-accent" />
          <span className="seonology-text">SEONOLOGY</span>
          <span className="seonology-sub">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            Services
          </span>
        </button>
        <button className={`quicklinks-toggle${showQuickLinks ? ' active' : ''}`} onClick={() => setShowQuickLinks(!showQuickLinks)} title="Quick Links">
          <svg width="14" height="14" viewBox="0 0 24 24" fill={showQuickLinks ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Quick Links</span>
        </button>
      </div>

      {/* Top Center - Weather & Exchange */}
      <div className="top-center-bar">
        <WeatherWidget onClick={() => openModal('weather')} />
        <div className="bar-divider"></div>
        <ExchangeWidget onClick={() => openModal('exchange')} />
      </div>

      {/* Main Clock */}
      <main className="main-content">
        <Clock />
        <SearchBar />
      </main>

      {/* Bottom Left - Todo Preview */}
      <TodoPreview onClick={() => openModal('todo')} />



      {/* Notes Panel */}
      <NotesPanel isOpen={showNotes} onClose={() => setShowNotes(false)} />

      {/* Modals */}
      <Modal isOpen={activeModal === 'services'} onClose={closeModal} title="SEONOLOGY">
        <ServicesModal />
      </Modal>

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
    </div>
  );
}

export default App;
