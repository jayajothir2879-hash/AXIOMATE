// src/pages/Risk.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { attachRisk } from '../utils/riskEngine';
import { Pill, riskTone, statusTone, priorityTone, toast } from '../components/UI';
import Modal from '../components/Modal';
import { ShieldAlert, ShieldCheck, ShieldQuestion, Search, Calendar, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';

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
  const [employees, setEmployees] = useState([]);
  const [q, setQ] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [mitigateProject, setMitigateProject] = useState(null);
  const [mitigateForm, setMitigateForm] = useState({ status: '', priority: '', progress: 0, end_date: '' });
  const [savingMitigation, setSavingMitigation] = useState(false);

  const load = async () => {
    try {
      const [{ data: projectRows }, { data: employeeRows }] = await Promise.all([
        supabase.from('projects').select('*, clients(name)').order('id'),
        supabase.from('employees').select('*'),
      ]);
      const normalized = (projectRows || []).map(p => ({ ...p, client_name: p.clients?.name || '' }));
      setProjects(attachRisk(normalized, employeeRows || []));
      setEmployees(employeeRows || []);
    } catch (err) {
      toast(err.message || 'Error loading risk data.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = projects.length;
    const high = projects.filter(p => p.risk?.level === 'High').length;
    const medium = projects.filter(p => p.risk?.level === 'Medium').length;
    const low = projects.filter(p => p.risk?.level === 'Low').length;
    const avgScore = total ? Math.round(projects.reduce((sum, p) => sum + (p.risk?.score || 0), 0) / total) : 0;
    return { total, high, medium, low, avgScore };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.project_code || '').toLowerCase().includes(q.toLowerCase()) || (p.client_name || '').toLowerCase().includes(q.toLowerCase());
      const matchRisk = !riskFilter || p.risk?.level === riskFilter;
      return matchQ && matchRisk;
    });
  }, [projects, q, riskFilter]);

  const openMitigate = (p) => {
    setMitigateProject(p);
    setMitigateForm({
      status: p.status || 'Active',
      priority: p.priority || 'Medium',
      progress: p.progress || 0,
      end_date: p.end_date || ''
    });
  };

  const saveMitigation = async () => {
    if (!mitigateProject) return;
    setSavingMitigation(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          status: mitigateForm.status,
          priority: mitigateForm.priority,
          progress: Number(mitigateForm.progress),
          end_date: mitigateForm.end_date || null
        })
        .eq('id', mitigateProject.id);

      if (error) throw error;
      toast('Mitigation actions applied successfully.');
      setMitigateProject(null);
      load();
    } catch (err) {
      toast(err.message || 'Error applying mitigation.');
    } finally {
      setSavingMitigation(false);
    }
  };

  const colorFor = (level) => (level === 'High' ? '#D5514C' : level === 'Medium' ? '#E2A33D' : '#2E9E5B');

  return (
    <div className="space-y-6">
      <div>
        <div className="font-semibold text-[15px] flex items-center gap-2">
          <AlertTriangle size={18} strokeWidth={2} className="text-teal" /> AI-Based Project Risk Prediction
        </div>
        <div className="text-[12.5px] text-slate-500 max-w-3xl mt-0.5">
          Classifies each project by analyzing progress vs. timeline, effort allocation, and delay signals.
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-[10px] p-3 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Total Evaluated</span>
          <span className="text-[20px] font-bold text-slate-800 mt-1">{stats.total}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-3 shadow-sm flex flex-col justify-between border-l-4 border-l-rose-500">
          <span className="text-[10px] uppercase font-semibold text-red tracking-wider">High Risk</span>
          <span className="text-[20px] font-bold text-red mt-1">{stats.high}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-3 shadow-sm flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-[10px] uppercase font-semibold text-amber-600 tracking-wider">Medium Risk</span>
          <span className="text-[20px] font-bold text-amber-600 mt-1">{stats.medium}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-3 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[10px] uppercase font-semibold text-green tracking-wider">Low Risk</span>
          <span className="text-[20px] font-bold text-green mt-1">{stats.low}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-3 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Average Risk Score</span>
          <span className="text-[20px] font-bold text-slate-800 mt-1">{stats.avgScore}/100</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2.5 items-center bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-sm">
        <div className="flex flex-wrap gap-2.5 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search size={14} />
            </span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by project name, code or client…"
              className="pl-9 pr-3 py-1.5 w-full rounded-lg text-[13px] border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal focus:border-teal transition-all"
            />
          </div>
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-[13px] border border-slate-200 bg-white"
          >
            <option value="">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="Low">Low Risk</option>
          </select>
        </div>
        <button
          onClick={load}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
          title="Refresh Analysis"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Risk Cards Grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {filteredProjects.map(p => {
          const riskLvl = p.risk?.level || 'Low';
          const riskColor = colorFor(riskLvl);

          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-[10px] p-4.5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition hover:shadow-md">
              <div>
                <div className="flex gap-3.5 items-start">
                  <RiskRing score={p.risk?.score || 0} color={riskColor} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-slate-800 truncate" title={p.name}>{p.name}</div>
                    <div className="text-[11.5px] text-slate-500 truncate mb-1.5">{p.client_name} · <span className="font-mono-plex">{p.project_code}</span></div>
                    <div className="flex flex-wrap gap-1 items-center">
                      <Pill tone={riskTone(riskLvl)}>{riskLvl}</Pill>
                      <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold mb-1">
                    <span>TIMELINE & PACE</span>
                    <span>{p.progress}% Complete</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-teal" style={{ width: `${p.progress}%` }} />
                    </div>
                  </div>
                  {p.start_date && p.end_date && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-4">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{p.start_date} → {p.end_date}</span>
                      <span className="text-[10px] text-slate-400 font-mono-plex ml-auto">({p.risk?.daysLeft || 0} days remaining)</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 tracking-wider">RISK ATTRIBUTION</div>
                  <ul className="pl-3.5 text-[12px] leading-relaxed list-disc text-slate-600 space-y-1">
                    {(p.risk?.reasons || []).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => openMitigate(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-teal hover:border-teal hover:text-white rounded-lg text-xs font-semibold transition"
                >
                  Mitigate Risk <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!filteredProjects.length && (
        <div className="bg-white border border-slate-200 rounded-[10px] p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3.5">
            {riskFilter ? <ShieldQuestion size={24} /> : <ShieldCheck size={24} className="text-emerald-500" />}
          </div>
          <h3 className="font-semibold text-slate-700 text-sm">No Projects Found</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {riskFilter ? `No projects with ${riskFilter} risk level match your search query.` : 'There are currently no projects recorded in the system.'}
          </p>
        </div>
      )}

      {/* Mitigation Action Modal */}
      {mitigateProject && (
        <Modal
          open={!!mitigateProject}
          onClose={() => setMitigateProject(null)}
          title={`Mitigate Risk: ${mitigateProject.name}`}
          subtitle="Adjust project variables to lower the delivery risk calculated by the AI engine."
          footer={
            <>
              <button
                onClick={() => setMitigateProject(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveMitigation}
                disabled={savingMitigation}
                className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-light disabled:opacity-50"
              >
                {savingMitigation ? 'Applying...' : 'Save Mitigation'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[12px] text-slate-500 mb-1 font-medium">Project Status</label>
              <select
                className="in"
                value={mitigateForm.status}
                onChange={e => setMitigateForm({ ...mitigateForm, status: e.target.value })}
              >
                <option>Active</option>
                <option>Completed</option>
                <option>Delayed</option>
                <option>On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-slate-500 mb-1 font-medium">Priority</label>
              <select
                className="in"
                value={mitigateForm.priority}
                onChange={e => setMitigateForm({ ...mitigateForm, priority: e.target.value })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-slate-500 mb-1 font-medium">Progress %</label>
              <input
                type="number"
                min="0"
                max="100"
                className="in font-mono-plex"
                value={mitigateForm.progress}
                onChange={e => setMitigateForm({ ...mitigateForm, progress: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-[12px] text-slate-500 mb-1 font-medium">Extend End Date</label>
              <input
                type="date"
                className="in font-mono-plex"
                value={mitigateForm.end_date}
                onChange={e => setMitigateForm({ ...mitigateForm, end_date: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}
      <style>{`.in{width:100%;padding:.5rem .6rem;border-radius:.45rem;font-size:.83rem;border:1px solid #E3E7EE;}`}</style>
    </div>
  );
}
