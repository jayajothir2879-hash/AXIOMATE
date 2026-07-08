// src/components/Topbar.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Menu, CircleUserRound, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const TITLES = {
  '/dashboard': 'Dashboard', '/notifications': 'Notification Center', '/projects': 'Projects',
  '/employees': 'Employees', '/clients': 'Clients', '/risk': 'AI Risk Prediction',
  '/effort': 'Effort Tracking', '/assistant': 'AI Project Assistant', '/reports': 'Reports',
  '/profile': 'My Profile', '/settings': 'Settings',
};

export default function Topbar({ path, onBurger }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const initials = (user?.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const isHome = path === '/dashboard';

  return (
    <div className="h-[62px] bg-white border-b border-slate-200 flex items-center justify-between px-5 sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        <button className="md:hidden w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50" onClick={onBurger} aria-label="Menu">
          <Menu size={17} />
        </button>
        {!isHome && (
          <button
            onClick={() => navigate(-1)}
            title="Go back"
            aria-label="Go back"
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600"
          >
            <ArrowLeft size={17} strokeWidth={2} />
          </button>
        )}
        <div className="font-semibold text-[16px]">{TITLES[path] || 'AXIOMATE'}</div>
      </div>
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => navigate('/notifications')}
          aria-label="Notifications"
          className="relative w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600"
        >
          <Bell size={17} strokeWidth={2} />
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-50"
          >
            <div className="w-7 h-7 rounded-full bg-teal text-white flex items-center justify-center text-xs font-bold overflow-hidden">
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <span className="text-[13px] font-semibold">{user?.name}</span>
          </button>
          {open && (
            <div className="absolute right-0 top-11 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[190px] p-1.5 z-50">
              <button onClick={() => { setOpen(false); navigate('/profile'); }} className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-slate-50">
                <CircleUserRound size={15} /> My Profile
              </button>
              <button onClick={() => { setOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-slate-50">
                <Settings size={15} /> Settings
              </button>
              <button onClick={logout} className="w-full flex items-center gap-2 text-left px-2.5 py-2 rounded-lg text-[13.5px] hover:bg-slate-50">
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
