import { useState, useEffect, useRef } from 'react';
import './FlipClock.css';

function FlipCard({ digit, prevDigit, isFlipping }) {
  return (
    <div className="flip-card">
      {/* Current (static) display */}
      <div className="flip-card-inner">
        <div className="card-face card-top">
          <span>{digit}</span>
        </div>
        <div className="card-face card-bottom">
          <span>{prevDigit}</span>
        </div>
      </div>

      {/* Animated flip overlay */}
      {isFlipping && (
        <div className="flip-animation">
          <div className="flip-top">
            <span>{prevDigit}</span>
          </div>
          <div className="flip-bottom">
            <span>{digit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom hook to track previous value - necessary for flip animation
function usePrevious(value) {
  const ref = useRef(value);
  const prev = useRef(value);

  useEffect(() => {
    prev.current = ref.current;
    ref.current = value;
  }, [value]);

  // eslint-disable-next-line react-hooks/refs
  return prev.current;
}

function FlipUnit({ value, prevValue, label }) {
  const [isFlipping, setIsFlipping] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (value !== prevValue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFlipping(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsFlipping(false);
      }, 600);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, prevValue]);

  const digits = String(value).padStart(2, '0').split('');
  const prevDigits = String(prevValue).padStart(2, '0').split('');

  return (
    <div className="flip-unit">
      <div className="flip-unit-cards">
        {digits.map((digit, index) => (
          <FlipCard
            key={index}
            digit={digit}
            prevDigit={prevDigits[index]}
            isFlipping={isFlipping && digit !== prevDigits[index]}
          />
        ))}
      </div>
      <span className="flip-unit-label">{label}</span>
    </div>
  );
}

function FlipClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const prevHours = usePrevious(hours);
  const prevMinutes = usePrevious(minutes);
  const prevSeconds = usePrevious(seconds);

  return (
    <div className="flip-clock">
      <div className="flip-clock-inner">
        <FlipUnit value={hours} prevValue={prevHours} label="HOURS" />
        <div className="flip-clock-separator">
          <span className="separator-dot"></span>
          <span className="separator-dot"></span>
        </div>
        <FlipUnit value={minutes} prevValue={prevMinutes} label="MINUTES" />
        <div className="flip-clock-separator">
          <span className="separator-dot"></span>
          <span className="separator-dot"></span>
        </div>
        <FlipUnit value={seconds} prevValue={prevSeconds} label="SECONDS" />
      </div>
    </div>
  );
}

export default FlipClock;
