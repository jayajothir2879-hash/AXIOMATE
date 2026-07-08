// src/pages/Risk.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { attachRisk } from '../utils/riskEngine';
import { Pill, riskTone } from '../components/UI';

function RiskRing({ score, color }) {
  const r = 24, c = 2 * Math.PI * r, off = c - (score / 100) * c;
  return (
    <div className="relative w-14 h-14 flex-none">
      <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="#E3E7EE" strokeWidth="6" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono-plex">{score}</div>
    </div>
  );
}

export default function Risk() {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    (async () => {
      const [{ data: projectRows }, { data: employees }] = await Promise.all([
        supabase.from('projects').select('*, clients(name)'),
        supabase.from('employees').select('*'),
      ]);
      const normalized = (projectRows || []).map(p => ({ ...p, client_name: p.clients?.name || '' }));
      setProjects(attachRisk(normalized, employees || []));
    })();
  }, []);

  const colorFor = (level) => (level === 'High' ? '#D5514C' : level === 'Medium' ? '#E2A33D' : '#2E9E5B');

  return (
    <div>
      <div className="font-semibold text-[15px]">AI-Based Project Risk Prediction</div>
      <div className="text-[12.5px] text-slate-500 mb-4">Classifies each project by analyzing progress vs. timeline, effort allocation and delay signals — computed live by the backend risk engine</div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {projects.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm">
            <div className="flex gap-3.5 items-center">
              <RiskRing score={p.risk?.score || 0} color={colorFor(p.risk?.level)} />
              <div className="flex-1">
                <div className="font-bold">{p.name}</div>
                <div className="text-[12px] text-slate-500">{p.client_name} · {p.project_code}</div>
                <Pill tone={riskTone(p.risk?.level)}>{p.risk?.level}</Pill>
              </div>
            </div>
            <div className="mt-3 text-[12.5px] text-slate-500">Why:</div>
            <ul className="mt-1.5 pl-4 text-[12.5px] leading-relaxed list-disc">
              {(p.risk?.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
