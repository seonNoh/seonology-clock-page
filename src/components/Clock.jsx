import { useState, useEffect } from 'react';
import './Clock.css';

function Clock() {
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('clock-theme') || 'digital';
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('clock-theme', theme);
  }, [theme]);

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return { hours, minutes, seconds };
  };

  const formatDate = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    return `${dayName}, ${month} ${day}`;
  };

  const { hours, minutes, seconds } = formatTime(time);

  const cycleTheme = () => {
    const themes = ['digital', 'analog'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Analog clock calculations
  const getAnalogAngles = () => {
    const h = time.getHours() % 12;
    const m = time.getMinutes();
    const s = time.getSeconds();
    
    return {
      hour: (h * 30) + (m * 0.5), // 30 degrees per hour + 0.5 degrees per minute
      minute: m * 6, // 6 degrees per minute
      second: s * 6, // 6 degrees per second
    };
  };

  const renderDigitalClock = () => (
    <>
      <div className="clock-time">
        <span className="clock-digits">{hours}</span>
        <span className="clock-separator">:</span>
        <span className="clock-digits">{minutes}</span>
      </div>
      <div className="clock-date">{formatDate(time)}</div>
    </>
  );

  const renderAnalogClock = () => {
    const angles = getAnalogAngles();
    
    return (
      <>
        <div className="analog-clock">
          <div className="analog-face">
            {/* Hour markers */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="hour-marker"
                style={{ transform: `rotate(${i * 30}deg)` }}
              >
                <div className="marker-line"></div>
              </div>
            ))}
            
            {/* Clock hands */}
            <div
              className="clock-hand hour-hand"
              style={{ transform: `rotate(${angles.hour}deg)` }}
            ></div>
            <div
              className="clock-hand minute-hand"
              style={{ transform: `rotate(${angles.minute}deg)` }}
            ></div>
            <div
              className="clock-hand second-hand"
              style={{ transform: `rotate(${angles.second}deg)` }}
            ></div>
            <div className="clock-center"></div>
          </div>
        </div>
        <div className="clock-date analog-date">{formatDate(time)}</div>
      </>
    );
  };

  return (
    <div className={`clock clock-${theme}`}>
      <button className="theme-toggle" onClick={cycleTheme} title="Change clock theme">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </button>
      
      {theme === 'digital' && renderDigitalClock()}
      {theme === 'analog' && renderAnalogClock()}
    </div>
  );
}

export default Clock;
