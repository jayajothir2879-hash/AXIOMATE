// src/pages/Settings.jsx
import React, { useState } from 'react';
import { toast } from '../components/UI';
import Modal from '../components/Modal';


export default function Settings() {
  const [tab, setTab] = useState('pref');
  const [theme, setTheme] = useState('light');
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const applyTheme = (mode) => {
    setTheme(mode);
    document.documentElement.classList.toggle('dark', mode === 'dark');
    toast(`Theme set to ${mode} mode.`);
  };

 const submitPassword = async () => {
  toast("Password update feature is not implemented yet.");
  setPwOpen(false);
};
  return (
    <div>
      <h2 className="font-display font-bold text-[15px]">Settings</h2>
      <p className="text-[12.5px] text-slate-500 mb-4">Application, notification and security preferences</p>

      <div className="flex gap-1 border-b border-slate-200 mb-4.5 mb-4">
        {[['pref', 'Preferences'], ['notif', 'Notifications'], ['sec', 'Security']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-[13.5px] font-semibold border-b-2 ${tab === k ? 'text-teal border-teal' : 'text-slate-500 border-transparent'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'pref' && (
        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm divide-y divide-slate-200">
          <Row label="Theme" desc="Switch between light and dark mode">
            <select value={theme} onChange={e => applyTheme(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[13px]">
              <option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </Row>
          <Row label="Language" desc="Interface display language">
            <select className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-[13px]">
              <option>English (US)</option><option>English (UK)</option><option>Spanish</option><option>French</option>
            </select>
          </Row>
          <Row label="Compact Sidebar" desc="Show icon-only navigation">
            <Toggle onChange={() => toast('Preference saved')} />
          </Row>
        </div>
      )}

      {tab === 'notif' && (
        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm divide-y divide-slate-200">
          <Row label="Deadline reminders" desc="Alerts before project deadlines"><Toggle defaultChecked onChange={() => toast('Preference saved')} /></Row>
          <Row label="High-risk warnings" desc="Immediate alerts for high-risk projects"><Toggle defaultChecked onChange={() => toast('Preference saved')} /></Row>
          <Row label="Workload alerts" desc="Notify when employees are overloaded"><Toggle defaultChecked onChange={() => toast('Preference saved')} /></Row>
          <Row label="Weekly report ready" desc="Notify when a new report is generated"><Toggle onChange={() => toast('Preference saved')} /></Row>
        </div>
      )}

      {tab === 'sec' && (
        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm divide-y divide-slate-200">
          <Row label="Two-Factor Authentication" desc="Require a code at sign-in for extra security">
            <Toggle onChange={(e) => toast(e.target.checked ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled')} />
          </Row>
          <Row label="Login alerts" desc="Email me on new device sign-in"><Toggle defaultChecked onChange={() => toast('Preference saved')} /></Row>
          <Row label="Change Password" desc="Update your account password">
            <button onClick={() => setPwOpen(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[12.5px] font-semibold hover:bg-slate-50">Change</button>
          </Row>
        </div>
      )}

      <Modal
        open={pwOpen} onClose={() => setPwOpen(false)} title="Change Password" subtitle="Choose a strong, unique password"
        footer={<>
          <button onClick={() => setPwOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold">Cancel</button>
          <button onClick={submitPassword} className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold">Update Password</button>
        </>}
      >
        <div className="grid gap-3 mt-2">
          <div><label className="block text-[12px] text-slate-500 mb-1 font-medium">Current Password</label>
            <input type="password" className="in" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} /></div>
          <div><label className="block text-[12px] text-slate-500 mb-1 font-medium">New Password</label>
            <input type="password" className="in" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} /></div>
          <div><label className="block text-[12px] text-slate-500 mb-1 font-medium">Confirm New Password</label>
            <input type="password" className="in" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} /></div>
        </div>
      </Modal>
      <style>{`.in{width:100%;padding:.5rem .6rem;border-radius:.45rem;font-size:.83rem;border:1px solid #E3E7EE;}`}</style>
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div><div className="text-[13.5px] font-semibold">{label}</div><div className="text-[12px] text-slate-500 mt-0.5">{desc}</div></div>
      {children}
    </div>
  );
}

function Toggle({ defaultChecked, onChange }) {
  return (
    <label className="relative inline-block w-[42px] h-6">
      <input type="checkbox" defaultChecked={defaultChecked} onChange={onChange} className="opacity-0 w-0 h-0 peer" />
      <span className="absolute inset-0 bg-slate-200 rounded-full cursor-pointer transition peer-checked:bg-teal before:content-[''] before:absolute before:w-[18px] before:h-[18px] before:left-[3px] before:top-[3px] before:bg-white before:rounded-full before:transition peer-checked:before:translate-x-[18px]" />
    </label>
  );
}
