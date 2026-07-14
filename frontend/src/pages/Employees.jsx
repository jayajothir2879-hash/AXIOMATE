// src/pages/Employees.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from '../components/Modal';
import { Pill, riskTone, toast } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { filterEmployees } from '../utils/authFilters';

const EMPTY = { name: '', email: '', phone: '', department: '', designation: '', assigned_projects: '', daily_hours: 0, weekly_hours: 0, productivity_score: 0, workload: 'Low' };

export default function Employees() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

  const canAdd = true;
  const canEdit = true;
  const canDelete = true;

  const load = () => supabase.from('employees').select('*, profiles(role)').order('id').then(({ data }) => {
    setRows(filterEmployees(data || [], user));
  });
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()) || (e.department || '').toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const openNew = () => {
    if (user?.role !== 'Admin') {
      toast("Access Denied: Only Admins can add employees.");
      return;
    }
    setForm(EMPTY); setEditingId(null); setModalOpen(true);
  };
  const openEdit = (e) => {
    if (user?.role !== 'Admin' && user?.role !== 'Project Manager') {
      toast("Access Denied: Only Admins and Project Managers can edit employees.");
      return;
    }
    setForm({ ...EMPTY, ...e }); setEditingId(e.id); setModalOpen(true);
  };

  const save = async () => {
    try {
      if (editingId) {
        const { error } = await supabase.from('employees').update(form).eq('id', editingId);
        if (error) throw error;
      } else {
        const { count } = await supabase.from('employees').select('*', { count: 'exact', head: true });
        const emp_code = 'EMP-' + String((count || 0) + 1).padStart(3, '0');
        const { error } = await supabase.from('employees').insert({ ...form, emp_code });
        if (error) throw error;
      }
      setModalOpen(false); load(); toast('Employee saved successfully.');
    } catch (err) { toast(err.message || 'Unable to save employee.'); }
  };
  const remove = async (id) => {
    if (user?.role !== 'Admin') {
      toast("Access Denied: Only Admins can delete employees.");
      return;
    }
    if (!confirm('Delete this employee?')) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) { toast(error.message); return; }
    load(); toast('Employee deleted.');
  };

  const riskLabel = (w) => (w === 'Overloaded' ? 'High' : w === 'High' ? 'Medium' : 'Low');

  return (
    <div>
      <div className="flex flex-wrap gap-2.5 items-center justify-between mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search employees, dept…" className="px-3 py-2 rounded-lg text-[13px] border border-slate-200 min-w-[220px]" />
        {canAdd && <button onClick={openNew} className="flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-light"><Plus size={15} strokeWidth={2} /> Add Employee</button>}
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] shadow-sm overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="text-[11.5px] uppercase text-slate-500 border-b border-slate-200">
              {['Code', 'Name', 'Department', 'Designation', 'Daily', 'Weekly', 'Productivity', 'Workload', ''].map(h => <th key={h} className="text-left px-3 py-2.5 whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-slate-100 last:border-none">
                <td className="px-3 py-2.5 font-mono-plex whitespace-nowrap">{e.emp_code}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><div className="font-semibold">{e.name}</div><div className="text-[11.5px] text-slate-500">{e.email}</div></td>
                <td className="px-3 py-2.5 whitespace-nowrap">{e.department}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{e.designation}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{e.daily_hours}h</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{e.weekly_hours}h</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{e.productivity_score}%</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><Pill tone={riskTone(riskLabel(e.workload))}>{e.workload}</Pill></td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {canEdit && <button onClick={() => openEdit(e)} className="px-1.5 py-1 rounded hover:bg-slate-100 text-slate-500"><Pencil size={14} strokeWidth={1.9} /></button>}
                  {canDelete && <button onClick={() => remove(e.id)} className="px-1.5 py-1 rounded hover:bg-slate-100 text-slate-500"><Trash2 size={14} strokeWidth={1.9} /></button>}
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={9} className="text-center text-slate-400 py-10">No employees found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editingId ? 'Edit' : 'New'} Employee`}
        footer={<>
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
          <button onClick={save} className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold">Save Employee</button>
        </>}>
        <div className="grid grid-cols-2 gap-3">
          <F label="Name" full><input className="in" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></F>
          <F label="Email"><input className="in" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></F>
          <F label="Phone"><input className="in" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></F>
          <F label="Department"><input className="in" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></F>
          <F label="Designation"><input className="in" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} /></F>
          <F label="Assigned Projects" full><input className="in" value={form.assigned_projects} onChange={e => setForm({ ...form, assigned_projects: e.target.value })} /></F>
          <F label="Daily Hours"><input type="number" className="in" value={form.daily_hours} onChange={e => setForm({ ...form, daily_hours: Number(e.target.value) })} /></F>
          <F label="Weekly Hours"><input type="number" className="in" value={form.weekly_hours} onChange={e => setForm({ ...form, weekly_hours: Number(e.target.value) })} /></F>
          <F label="Productivity Score"><input type="number" className="in" value={form.productivity_score} onChange={e => setForm({ ...form, productivity_score: Number(e.target.value) })} /></F>
          <F label="Workload">
            <select className="in" value={form.workload} onChange={e => setForm({ ...form, workload: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Overloaded</option></select>
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
