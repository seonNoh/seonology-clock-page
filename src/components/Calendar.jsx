import { useState, useEffect, useMemo } from 'react';
import Holidays from 'date-holidays';
import './Calendar.css';

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());

  // Initialize holidays for Korea and Japan
  const krHolidays = useMemo(() => new Holidays('KR'), []);
  const jpHolidays = useMemo(() => new Holidays('JP'), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDay = firstDayOfMonth.getDay();

  // Get holidays for this month
  const getHolidaysForDate = (date) => {
    const holidays = [];

    const krHoliday = krHolidays.isHoliday(date);
    if (krHoliday && krHoliday.length > 0) {
      holidays.push({ country: 'KR', name: krHoliday[0].name });
    }

    const jpHoliday = jpHolidays.isHoliday(date);
    if (jpHoliday && jpHoliday.length > 0) {
      holidays.push({ country: 'JP', name: jpHoliday[0].name });
    }

    return holidays;
  };

  // Generate calendar days
  const days = [];
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      day: prevMonthDays - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push({
      day: i,
      isCurrentMonth: true,
      date,
      isToday:
        i === currentDate.getDate() &&
        month === currentDate.getMonth() &&
        year === currentDate.getFullYear(),
      holidays: getHolidaysForDate(date),
    });
  }

  // Next month days (fill remaining cells)
  const remainingDays = 42 - days.length; // 6 rows × 7 days
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
  ];

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // Get upcoming holidays
  const upcomingHolidays = useMemo(() => {
    const holidays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);

      const krHoliday = krHolidays.isHoliday(checkDate);
      const jpHoliday = jpHolidays.isHoliday(checkDate);

      if (krHoliday || jpHoliday) {
        if (krHoliday && krHoliday.length > 0) {
          holidays.push({
            date: new Date(checkDate),
            name: krHoliday[0].name,
            country: '🇰🇷',
          });
        }
        if (jpHoliday && jpHoliday.length > 0) {
          holidays.push({
            date: new Date(checkDate),
            name: jpHoliday[0].name,
            country: '🇯🇵',
          });
        }
      }

      if (holidays.length >= 4) break;
    }

    return holidays;
  }, [krHolidays, jpHolidays]);

  const formatHolidayDate = (date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={prevMonth}>
          ‹
        </button>
        <div className="calendar-title">
          <span>{year}년 {monthNames[month]}</span>
          <button className="calendar-today" onClick={goToToday}>
            오늘
          </button>
        </div>
        <button className="calendar-nav" onClick={nextMonth}>
          ›
        </button>
      </div>

      <div className="calendar-grid">
        {dayNames.map((day, index) => (
          <div
            key={day}
            className={`calendar-day-name ${
              index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''
            }`}
          >
            {day}
          </div>
        ))}

        {days.map((dayInfo, index) => {
          const dayOfWeek = dayInfo.date.getDay();
          const hasKrHoliday = dayInfo.holidays?.some((h) => h.country === 'KR');
          const hasJpHoliday = dayInfo.holidays?.some((h) => h.country === 'JP');

          return (
            <div
              key={index}
              className={`calendar-day ${
                !dayInfo.isCurrentMonth ? 'other-month' : ''
              } ${dayInfo.isToday ? 'today' : ''} ${
                dayOfWeek === 0 || hasKrHoliday ? 'sunday' : ''
              } ${dayOfWeek === 6 ? 'saturday' : ''}`}
              title={
                dayInfo.holidays?.map((h) => `${h.country === 'KR' ? '🇰🇷' : '🇯🇵'} ${h.name}`).join('\n') || ''
              }
            >
              <span className="day-number">{dayInfo.day}</span>
              {dayInfo.holidays && dayInfo.holidays.length > 0 && (
                <div className="holiday-dots">
                  {hasKrHoliday && <span className="holiday-dot kr"></span>}
                  {hasJpHoliday && <span className="holiday-dot jp"></span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {upcomingHolidays.length > 0 && (
        <div className="upcoming-holidays">
          <div className="upcoming-title">다가오는 휴일</div>
          <div className="upcoming-list">
            {upcomingHolidays.map((holiday, index) => (
              <div key={index} className="upcoming-item">
                <span className="upcoming-country">{holiday.country}</span>
                <span className="upcoming-date">{formatHolidayDate(holiday.date)}</span>
                <span className="upcoming-name">{holiday.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
