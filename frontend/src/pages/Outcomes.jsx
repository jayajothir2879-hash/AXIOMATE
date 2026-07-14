// src/pages/Outcomes.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { filterProjects } from '../utils/authFilters';
import { Pill, statusTone } from '../components/UI';

export default function Outcomes() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    const [{ data: projectRows }, { data: employeeRows }] = await Promise.all([
      supabase.from('projects').select('*, clients(name)').order('id'),
      supabase.from('employees').select('*, profiles(role)'),
    ]);

    const normalized = (projectRows || []).map(p => ({
      ...p,
      client_name: p.clients?.name || ''
    }));
    setProjects(filterProjects(normalized, employeeRows || [], user));
  };

  useEffect(() => {
    load();
  }, [user]);

  const filtered = useMemo(() => projects.filter(p => {
    const matchQ = !q || 
      p.name.toLowerCase().includes(q.toLowerCase()) || 
      (p.project_code || '').toLowerCase().includes(q.toLowerCase()) || 
      (p.client_name || '').toLowerCase().includes(q.toLowerCase());
    return matchQ && (!statusFilter || p.status === statusFilter);
  }), [projects, q, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <div className="font-semibold text-[15px] flex items-center gap-2">
          <ClipboardList size={16} strokeWidth={2} className="text-teal" /> Project Outcomes
        </div>
        <div className="text-[12.5px] text-slate-500 max-w-2xl mt-0.5">
          View the recorded outcomes and remarks for all active and completed projects.
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm w-full">
        <div className="flex flex-wrap gap-2.5 items-center justify-between mb-4">
          <div className="flex flex-wrap gap-2.5">
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder="Search project code, name or client…" 
              className="px-3 py-2 rounded-lg text-[13px] border border-slate-200 min-w-[260px]" 
            />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="px-2.5 py-2 rounded-lg text-[13px] border border-slate-200"
            >
              <option value="">All Status</option>
              <option>Active</option>
              <option>Completed</option>
              <option>Delayed</option>
              <option>On Hold</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-[11.5px] uppercase text-slate-500 border-b border-slate-200 bg-slate-50/70">
                <th className="text-left px-4 py-3 whitespace-nowrap">Code</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Project</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Client</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Timeline</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Progress</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 whitespace-nowrap min-w-[280px]">Project Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-none hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono-plex whitespace-nowrap font-semibold">{p.project_code || '—'}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{p.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{p.client_name || '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-500 whitespace-nowrap">
                    {p.start_date && p.end_date ? `${p.start_date} → ${p.end_date}` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-[60px] h-1.5 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-teal" style={{ width: `${p.progress}%` }} />
                      </div>
                      <span className="text-[12px]">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                  </td>
                  <td className="px-4 py-3 leading-relaxed text-[13px] text-slate-700 whitespace-pre-wrap max-w-sm">
                    {p.remarks ? (
                      p.remarks
                    ) : (
                      <span className="text-slate-400 italic">No outcome recorded yet. Edit project to add.</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-10">
                    No projects found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}