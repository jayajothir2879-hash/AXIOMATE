// src/pages/Clients.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import { Pill, riskTone, toast } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { filterProjects, filterEmployees } from '../utils/authFilters';

const EMPTY = {
  client_name: '',
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  project_count: 0,
  active_projects: 0,
  completed_projects: 0,
  risk_level: 'Low'
};

export default function Clients() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const canEdit = user?.role === 'Admin' || user?.role === 'Project Manager' || user?.role === 'Employee';

  const load = async () => {
    const [{ data: clientsData }, { data: projectsData }, { data: employeesData }] = await Promise.all([
      supabase.from('clients').select('*').order('id'),
      supabase.from('projects').select('client_id, assigned_employees'),
      supabase.from('employees').select('*, profiles(role)'),
    ]);

    const visibleProjects = filterProjects(projectsData || [], employeesData || [], user);
    const visibleClientIds = new Set(visibleProjects.map(p => p.client_id).filter(Boolean));

    const mapped = (clientsData || [])
      .filter(c => user.role === 'Admin' || visibleClientIds.has(c.id))
      .map(c => ({
        ...c,
        client_name: c.name,
        company_name: c.company
      }));
    setRows(mapped);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
  rows.filter(c =>
    !q ||
    (c.client_name || '').toLowerCase().includes(q.toLowerCase()) ||
    (c.company_name || '').toLowerCase().includes(q.toLowerCase())
  ),
  [rows, q]
);

  const openNew = () => {
    if (user?.role !== 'Admin' && user?.role !== 'Project Manager') {
      toast("Access Denied: Only Admins and Project Managers can manage clients.");
      return;
    }
    setForm(EMPTY); setEditingId(null); setModalOpen(true);
  };
  const openEdit = (c) => {
    if (user?.role !== 'Admin' && user?.role !== 'Project Manager') {
      toast("Access Denied: Only Admins and Project Managers can manage clients.");
      return;
    }
    setForm({ ...EMPTY, ...c }); setEditingId(c.id); setModalOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        name: form.client_name,
        company: form.company_name,
        contact_person: form.contact_person,
        email: form.email,
        phone: form.phone,
        project_count: form.project_count,
        active_projects: form.active_projects,
        completed_projects: form.completed_projects,
        risk_level: form.risk_level
      };
      if (editingId) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { count } = await supabase.from('clients').select('*', { count: 'exact', head: true });
        const client_code = 'CLI-' + String((count || 0) + 1).padStart(3, '0');
        const { error } = await supabase.from('clients').insert({ ...payload, client_code });
        if (error) throw error;
      }
      setModalOpen(false); load(); toast('Client saved successfully.');
    } catch (err) { toast(err.message || 'Unable to save client.'); }
  };
  const remove = async (id) => {
    if (user?.role !== 'Admin' && user?.role !== 'Project Manager') {
      toast("Access Denied: Only Admins and Project Managers can manage clients.");
      return;
    }
    if (!confirm('Delete this client?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { toast(error.message); return; }
    load(); toast('Client deleted.');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2.5 items-center justify-between mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients or company…" className="px-3 py-2 rounded-lg text-[13px] border border-slate-200 min-w-[220px]" />
        {canEdit && <button onClick={openNew} className="flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-light"><Plus size={15} strokeWidth={2} /> Add Client</button>}
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-[11.5px] uppercase text-slate-500 border-b border-slate-200">
              {['Code', 'Client', 'Company', 'Contact', 'Projects', 'Active', 'Completed', 'Risk', ''].map(h => <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-slate-100 last:border-none">
                <td className="px-3 py-2.5 font-mono-plex whitespace-nowrap">{c.client_code}</td>
                <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
  {c.client_name}
</td>

<td className="px-3 py-2.5 whitespace-nowrap">
  {c.company_name}
</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><div>{c.contact_person}</div><div className="text-[11.5px] text-slate-500">{c.email}</div></td>
                <td className="px-3 py-2.5 whitespace-nowrap">{c.project_count}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{c.active_projects}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{c.completed_projects}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><Pill tone={riskTone(c.risk_level)}>{c.risk_level}</Pill></td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {canEdit && <>
                    <button onClick={() => openEdit(c)} className="px-1.5 py-1 rounded hover:bg-slate-100 text-slate-500"><Pencil size={14} strokeWidth={1.9} /></button>
                    <button onClick={() => remove(c.id)} className="px-1.5 py-1 rounded hover:bg-slate-100 text-slate-500"><Trash2 size={14} strokeWidth={1.9} /></button>
                  </>}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="text-center text-slate-400 py-10">No clients found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editingId ? 'Edit' : 'New'} Client`}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold">Save Client</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Client Name" full>
  <input
    className="in"
    value={form.client_name}
    onChange={e =>
      setForm({
        ...form,
        client_name: e.target.value
      })
    }
  />
</F>
          <F label="Company">
  <input
    className="in"
    value={form.company_name}
    onChange={e =>
      setForm({
        ...form,
        company_name: e.target.value
      })
    }
  />
</F>
          <F label="Contact Person"><input className="in" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} /></F>
          <F label="Email"><input className="in" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
          <F label="Phone"><input className="in" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></F>
          <F label="Project Count"><input type="number" className="in" value={form.project_count} onChange={e => setForm({ ...form, project_count: Number(e.target.value) })} /></F>
          <F label="Active Projects"><input type="number" className="in" value={form.active_projects} onChange={e => setForm({ ...form, active_projects: Number(e.target.value) })} /></F>
          <F label="Completed Projects"><input type="number" className="in" value={form.completed_projects} onChange={e => setForm({ ...form, completed_projects: Number(e.target.value) })} /></F>
          <F label="Risk Level">
            <select className="in" value={form.risk_level} onChange={e => setForm({ ...form, risk_level: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select>
          </F>
        </div>
      </Modal>
      <style>{`.in{width:100%;padding:.5rem .6rem;border-radius:.45rem;font-size:.83rem;border:1px solid #E3E7EE;}`}</style>
    </div>
  );
}

function F({ label, children, full }) {
  return <div className={full ? 'col-span-2' : ''}><label className="block text-[12px] text-slate-500 mb-1 font-medium">{label}</label>{children}</div>;
}
