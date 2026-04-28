'use client';

import React, { useState } from 'react';

/**
 * CalendarWidget — paramétrable
 * Props: currentDateStr (string), onDateSelect (fn)
 */
const CalendarWidget = ({ currentDateStr = 'Mar 9, 2023', onDateSelect }) => {
  const base      = new Date(currentDateStr);
  const baseValid = isNaN(base) ? new Date(2023, 2, 9) : base;
  const [offset, setOffset] = useState(0);

  const viewDate     = new Date(baseValid.getFullYear(), baseValid.getMonth() + offset, 1);
  const year         = viewDate.getFullYear();
  const month        = viewDate.getMonth();
  const highlightDay = offset === 0 ? baseValid.getDate() : null;
  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const monthName    = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const minDate      = new Date(2019, 10, 1);
  const maxDate      = new Date(2023, 2, 9);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isOutOfRange = (d) => {
    if (!d) return false;
    const dt = new Date(year, month, d);
    return dt < minDate || dt > maxDate;
  };

  return (
    <div style={{ padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={() => setOffset(o => o - 1)} style={{ background: 'none', border: '1px solid #e0e0ff', borderRadius: 6, cursor: 'pointer', fontSize: 16, color: '#6c5ce7', padding: '2px 8px', lineHeight: 1 }}>‹</button>
        <span style={{ fontWeight: 700, color: '#333', fontSize: 12 }}>{monthName}</span>
        <button onClick={() => setOffset(o => o + 1)} style={{ background: 'none', border: '1px solid #e0e0ff', borderRadius: 6, cursor: 'pointer', fontSize: 16, color: '#6c5ce7', padding: '2px 8px', lineHeight: 1 }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center' }}>
        {['Mo','Tu','We','Th','Fr','Sa','Su'].map((d, i) => (
          <div key={i} style={{ fontSize: 9, color: '#aaa', padding: '2px 0', fontWeight: 700 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const oor   = isOutOfRange(d);
          const isSel = d === highlightDay;
          return (
            <div key={i}
              onClick={() => { if (d && !oor && onDateSelect) onDateSelect(new Date(year, month, d)); }}
              style={{ fontSize: 11, padding: '4px 2px', borderRadius: 5, color: isSel ? '#fff' : oor ? '#ddd' : '#333', background: isSel ? '#6c5ce7' : 'transparent', fontWeight: isSel ? 700 : 400, cursor: d && !oor ? 'pointer' : 'default', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (d && !oor && !isSel) e.currentTarget.style.background = '#f0eeff'; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >{d || ''}</div>
          );
        })}
      </div>
      <div style={{ fontSize: 9, color: '#aaa', textAlign: 'center', marginTop: 6 }}>Nov 2019 – Mar 2023</div>
    </div>
  );
};

export default CalendarWidget;