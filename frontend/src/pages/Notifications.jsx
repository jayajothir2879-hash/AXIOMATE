// src/pages/Notifications.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Notifications() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => setItems(data || []));
  }, []);

  const dotColor = (type) => ({ risk: '#D5514C', warn: '#E2A33D' }[type] || '#0F6E7C');

  return (
    <div>
      <div className="font-semibold text-[15px]">Notification Center</div>
      <div className="text-[12.5px] text-slate-500 mb-4">Project updates, deadline reminders, workload alerts and risk warnings</div>

      <div className="notif-scroll flex gap-3.5 overflow-x-auto pb-3 mb-4">
        {items.map(n => (
          <div key={n.id} className="flex-none w-[280px] bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm border-l-4"
            style={{ borderLeftColor: dotColor(n.type) }}>
            <div className="text-[10.5px] uppercase tracking-wide text-slate-500 mb-1.5">{n.title}</div>
            <div className="text-[13.5px] leading-snug mb-2">{n.message}</div>
            <div className="text-[11px] text-slate-400">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm">
        {items.map(n => (
          <div key={n.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-none">
            <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-none" style={{ background: dotColor(n.type) }} />
            <div>
              <div className="font-semibold text-[13.5px]">{n.title}</div>
              <div className="text-[13px] text-slate-500 mt-0.5">{n.message}</div>
              <div className="text-[11px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {!items.length && <div className="text-center text-slate-400 py-10">No notifications yet.</div>}
      </div>
    </div>
  );
}
