// src/pages/Projects.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { attachRisk } from '../utils/riskEngine';
import Modal from '../components/Modal';
import { Pill, riskTone, statusTone, priorityTone, toast } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { filterProjects } from '../utils/authFilters';

const EMPTY = { name: '', client_id: '', start_date: '', end_date: '', progress: 0, priority: 'Medium', status: 'Active', assigned_employees: '', remarks: '' };

export default function Projects() {
  const { user } = useAuth();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.statusFilter || '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  const canEdit = user?.role === 'Admin' || user?.role === 'Project Manager' || user?.role === 'Employee';

  const load = async () => {
    const [{ data: projectRows }, { data: employeeRows }, { data: clientRows }] = await Promise.all([
      supabase.from('projects').select('*, clients(name)').order('id'),
      supabase.from('employees').select('*, profiles(role)'),
      supabase.from('clients').select('*').order('name'),
    ]);
    const normalized = (projectRows || []).map(p => ({ ...p, client_name: p.clients?.name || '' }));
    const visibleProjects = filterProjects(normalized, employeeRows || [], user);
    setProjects(attachRisk(visibleProjects, employeeRows || []));
    setClients(clientRows || []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => projects.filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || (p.project_code || '').toLowerCase().includes(q.toLowerCase()) || (p.client_name || '').toLowerCase().includes(q.toLowerCase());
    return matchQ && (!statusFilter || p.status === statusFilter) && (!priorityFilter || p.priority === priorityFilter);
  }), [projects, q, statusFilter, priorityFilter]);

  const openNew = () => {
    if (user?.role !== 'Admin' && user?.role !== 'Project Manager') {
      toast("Access Denied: Only Admins and Project Managers can manage projects.");
      return;
    }
    setForm(EMPTY); setEditingId(null); setModalOpen(true);
  };
  const openEdit = (p) => {
    if (user?.role !== 'Admin' && user?.role !== 'Project Manager') {
      toast("Access Denied: Only Admins and Project Managers can manage projects.");
      return;
    }
    setForm({ name: p.name, client_id: p.client_id || '', start_date: p.start_date || '', end_date: p.end_date || '', progress: p.progress, priority: p.priority, status: p.status, assigned_employees: p.assigned_employees || '', remarks: p.remarks || '' });
    setEditingId(p.id); setModalOpen(true);
  };

  const save = async () => {
    try {
      const payload = { ...form, client_id: form.client_id || null };
      if (editingId) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
        const project_code = 'PRJ-' + String((count || 0) + 1).padStart(3, '0');
        const { error } = await supabase.from('projects').insert({ ...payload, project_code });
        if (error) throw error;
      }
      setModalOpen(false); load(); toast('Project saved successfully.');
    } catch (err) { toast(err.message || 'Unable to save project.'); }
  };

  const remove = async (id) => {
    if (user?.role !== 'Admin' && user?.role !== 'Project Manager') {
      toast("Access Denied: Only Admins and Project Managers can manage projects.");
      return;
    }
    if (!confirm('Delete this project? This cannot be undone.')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { toast(error.message); return; }
    load(); toast('Project deleted.');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2.5 items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2.5">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search projects, code or client…" className="px-3 py-2 rounded-lg text-[13px] border border-slate-200 min-w-[220px]" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2.5 py-2 rounded-lg text-[13px] border border-slate-200">
            <option value="">All Status</option><option>Active</option><option>Completed</option><option>Delayed</option><option>On Hold</option>
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="px-2.5 py-2 rounded-lg text-[13px] border border-slate-200">
            <option value="">All Priority</option><option>Low</option><option>Medium</option><option>High</option>
          </select>
        </div>
        {canEdit && <button onClick={openNew} className="flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-light"><Plus size={15} strokeWidth={2} /> Add Project</button>}
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-[11.5px] uppercase text-slate-500 border-b border-slate-200">
              {['Code', 'Project', 'Client', 'Timeline', 'Progress', 'Priority', 'Status', 'Risk', ''].map(h => <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b border-slate-100 last:border-none">
                <td className="px-3 py-2.5 font-mono-plex whitespace-nowrap">{p.project_code}</td>
                <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{p.name}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{p.client_name}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">{p.start_date} → {p.end_date}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-[70px] h-1.5 bg-slate-100 rounded overflow-hidden"><div className="h-full bg-teal" style={{ width: `${p.progress}%` }} /></div>
                    <span className="text-[12px]">{p.progress}%</span>
                  </div>
                </td>
                <td className="px-3 py-2.5"><Pill tone={priorityTone(p.priority)}>{p.priority}</Pill></td>
                <td className="px-3 py-2.5"><Pill tone={statusTone(p.status)}>{p.status}</Pill></td>
                <td className="px-3 py-2.5"><Pill tone={riskTone(p.risk?.level)}>{p.risk?.level}</Pill></td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {canEdit && <>
                    <button onClick={() => openEdit(p)} className="px-1.5 py-1 rounded hover:bg-slate-100 text-slate-500"><Pencil size={14} strokeWidth={1.9} /></button>
                    <button onClick={() => remove(p.id)} className="px-1.5 py-1 rounded hover:bg-slate-100 text-slate-500"><Trash2 size={14} strokeWidth={1.9} /></button>
                  </>}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="text-center text-slate-400 py-10">No projects match your filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editingId ? 'Edit' : 'New'} Project`} subtitle="Fill in the project details below."
        footer={<>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold">Save Project</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Project Name" full><input className="in" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F>
          <F label="Client">
            <select className="in" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">— Select —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Priority">
            <select className="in" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select>
          </F>
          <F label="Start Date"><input type="date" className="in" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></F>
          <F label="End Date"><input type="date" className="in" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></F>
          <F label="Progress %"><input type="number" className="in" value={form.progress} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} /></F>
          <F label="Status">
            <select className="in" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Completed</option><option>Delayed</option><option>On Hold</option></select>
          </F>
          <F label="Assigned Employees (comma-separated)" full><input className="in" value={form.assigned_employees} onChange={e => setForm({ ...form, assigned_employees: e.target.value })} /></F>
          <F label="Project Outcome" full><textarea className="in" rows={3} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} /></F>
        </div>
      </Modal>
      <style>{`.in{width:100%;padding:.5rem .6rem;border-radius:.45rem;font-size:.83rem;border:1px solid #E3E7EE;}`}</style>
    </div>
  );
}

function F({ label, children, full }) {
  return <div className={full ? 'col-span-2' : ''}><label className="block text-[12px] text-slate-500 mb-1 font-medium">{label}</label>{children}</div>;
}
