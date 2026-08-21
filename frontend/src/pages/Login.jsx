// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Briefcase, User, Key, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Sidebar';

export default function Login() {
  const location = useLocation();
  
  const demoCredentials = {
    'Admin': { email: 'kaviyaselvan2007@gmail.com', password: 'password123' },
    'Project Manager': { email: 'abishekram030@gmail.com', password: 'password123' },
    'Employee': { email: 'selvankavi14@gmail.com', password: 'password123' }
  };

  const [activeRole, setActiveRole] = useState('Employee');
  const [email, setEmail] = useState('selvankavi14@gmail.com');
  const [password, setPassword] = useState('password123');
  const [savedPassword, setSavedPassword] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.confirmationNotice || (new URLSearchParams(location.search).get('confirmation') === 'success'
    ? 'Email confirmed. You can sign in now.'
    : ''));
  const [loading, setLoading] = useState(false);
  const { login, verify2FACode } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    setError('');
    
    const currentDemo = demoCredentials[activeRole];
    const targetDemo = demoCredentials[role];
    
    // Check if the current inputs match the current tab's demo credentials OR are empty
    const isCurrentDemoEmail = !email || email.trim().toLowerCase() === currentDemo.email.toLowerCase();
    const isCurrentDemoPassword = !password || password === currentDemo.password;
    
    if (isCurrentDemoEmail && isCurrentDemoPassword) {
      setEmail(targetDemo.email);
      setPassword(targetDemo.password);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setLoading(true);
    try {
      const res = await login(email, password);
      if (res && res.twoFactorRequired) {
        setSavedPassword(password);
        setShow2FA(true);
        setNotice('A 2-step verification code has been sent to your email.');
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      let msg = err.message || 'Unable to sign in. Check your email and password.';
      if (msg === '{}' || msg === '[]') {
        msg = 'Unable to sign in. Check your network connection or try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submit2FA = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setLoading(true);
    try {
      await verify2FACode(email, twoFactorCode);
      await login(email, savedPassword, true);
      navigate('/dashboard');
    } catch (err) {
      let msg = err.response?.data?.message || err.message || 'Invalid verification code.';
      if (msg === '{}' || msg === '[]') {
        msg = 'Invalid verification code. Please try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const backgroundStyles = {
    'Admin': 'radial-gradient(circle at 15% 20%, rgba(213,81,76,.18), transparent 45%), radial-gradient(circle at 85% 80%, rgba(226,163,61,.12), transparent 40%)',
    'Project Manager': 'radial-gradient(circle at 15% 20%, rgba(15,110,124,.22), transparent 45%), radial-gradient(circle at 85% 80%, rgba(46,158,91,.10), transparent 40%)',
    'Employee': 'radial-gradient(circle at 15% 20%, rgba(62,111,217,.16), transparent 45%), radial-gradient(circle at 85% 80%, rgba(30,46,74,.22), transparent 40%)'
  };

  const cardBorderAndGlow = {
    'Admin': 'border-red/20 shadow-[0_0_50px_rgba(213,81,76,0.12)]',
    'Project Manager': 'border-teal/20 shadow-[0_0_50px_rgba(15,110,124,0.15)]',
    'Employee': 'border-blue/20 shadow-[0_0_50px_rgba(62,111,217,0.12)]'
  };

  const headerInfo = {
    'Admin': {
      title: 'Admin Console',
      desc: 'Access platform settings, infrastructure controls, and user permissions.'
    },
    'Project Manager': {
      title: 'Manager Portal',
      desc: 'Review project risks, plan resource efforts, and analyze reports.'
    },
    'Employee': {
      title: 'Employee Portal',
      desc: 'Log project hours, submit timesheets, and view assigned duties.'
    }
  };

  const buttonStyles = {
    'Admin': 'bg-red hover:bg-red/90 shadow-[0_4px_12px_rgba(213,81,76,0.2)] focus:ring-red/50',
    'Project Manager': 'bg-teal hover:bg-teal-light shadow-[0_4px_12px_rgba(15,110,124,0.2)] focus:ring-teal/50',
    'Employee': 'bg-blue hover:bg-blue/90 shadow-[0_4px_12px_rgba(62,111,217,0.2)] focus:ring-blue/50'
  };

  const inputFocusStyles = {
    'Admin': 'focus:border-red focus:ring-red/20',
    'Project Manager': 'focus:border-teal focus:ring-teal/20',
    'Employee': 'focus:border-blue focus:ring-blue/20'
  };

  const currentDemo = demoCredentials[activeRole];
  const isDemoFilled = email.trim().toLowerCase() === currentDemo.email.toLowerCase() && password === currentDemo.password;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-navy-950 overflow-hidden transition-all duration-700">
      {/* Background Gradients Layering for Smooth Transition */}
      <div 
        className="absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none"
        style={{ 
          backgroundImage: backgroundStyles['Admin'],
          opacity: activeRole === 'Admin' ? 1 : 0 
        }} 
      />
      <div 
        className="absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none"
        style={{ 
          backgroundImage: backgroundStyles['Project Manager'],
          opacity: activeRole === 'Project Manager' ? 1 : 0 
        }} 
      />
      <div 
        className="absolute inset-0 transition-opacity duration-700 ease-in-out pointer-events-none"
        style={{ 
          backgroundImage: backgroundStyles['Employee'],
          opacity: activeRole === 'Employee' ? 1 : 0 
        }} 
      />

      <div className={`relative z-10 w-full max-w-[420px] bg-navy-900/90 backdrop-blur-md border rounded-2xl p-8 transition-all duration-500 ${cardBorderAndGlow[activeRole]}`}>
        <div className="flex items-center gap-2.5 mb-6">
          <Logo />
          <span className="text-white font-bold text-xl font-display tracking-tight">AXIOMATE</span>
        </div>

        {/* Unified Role Selector Tabs */}
        {!show2FA && (
          <div className="grid grid-cols-3 gap-1 p-1 bg-navy-800/80 backdrop-blur rounded-xl border border-navy-700/50 mb-6 relative">
            {/* Sliding Pill Indicator */}
            <div 
              className={`absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out border ${
                activeRole === 'Admin' 
                  ? 'bg-red/10 border-red/30 shadow-[0_0_12px_rgba(213,81,76,0.15)]' 
                  : activeRole === 'Project Manager'
                  ? 'bg-teal/10 border-teal/30 shadow-[0_0_12px_rgba(15,110,124,0.15)]'
                  : 'bg-blue/10 border-blue/30 shadow-[0_0_12px_rgba(62,111,217,0.15)]'
              }`}
              style={{
                left: activeRole === 'Admin' ? '4px' : activeRole === 'Project Manager' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 2px)',
                width: 'calc(33.33% - 6px)'
              }}
            />
            
            <button
              type="button"
              onClick={() => handleRoleSelect('Admin')}
              className={`relative z-10 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                activeRole === 'Admin' ? 'text-red' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('Project Manager')}
              className={`relative z-10 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                activeRole === 'Project Manager' ? 'text-teal-light' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Manager</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect('Employee')}
              className={`relative z-10 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                activeRole === 'Employee' ? 'text-blue' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Employee</span>
            </button>
          </div>
        )}

        {/* Dynamic Portal Header Info */}
        {!show2FA && (
          <div className="mb-6 animate-fadeIn">
            <h2 className="text-lg font-bold text-white font-display mb-1">{headerInfo[activeRole].title}</h2>
            <p className="text-[12.5px] text-slate-400 leading-relaxed">{headerInfo[activeRole].desc}</p>
          </div>
        )}

        {show2FA ? (
          <form onSubmit={submit2FA}>
            {notice && <div className="text-[12.5px] text-emerald-300 mb-3">{notice}</div>}
            <div className="mb-4">
              <label className="block text-[12.5px] text-slate-300 mb-1.5 font-medium">Verification Code</label>
              <input value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value)} type="text"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-navy-800 border border-navy-700 text-white placeholder-slate-500 text-center tracking-widest font-mono text-lg"
                placeholder="000000" maxLength={6} />
            </div>
            {error && <div className="text-[12.5px] text-red-300 mb-3">{error}</div>}
            <button disabled={loading} type="submit"
              className={`w-full py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 transition-all ${buttonStyles[activeRole]}`}>
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>
            <button type="button" onClick={() => { setShow2FA(false); setError(''); setNotice(''); }}
              className="w-full mt-3 py-2.5 rounded-lg font-semibold text-sm border border-navy-700 text-slate-300 hover:bg-navy-800">
              Back to Login
            </button>
          </form>
        ) : (
          <form onSubmit={submit}>
            {notice && <div className="text-[12.5px] text-emerald-300 mb-3">{notice}</div>}
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12.5px] text-slate-300 font-medium">Email Address</label>
                {isDemoFilled && (
                  <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium tracking-wide">
                    Demo Preset
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input value={email} onChange={e => setEmail(e.target.value)} type="text"
                  className={`w-full pl-10 pr-3 py-2.5 rounded-lg text-sm bg-navy-800 border border-navy-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${inputFocusStyles[activeRole]}`}
                  placeholder="you@axiomate.com" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[12.5px] text-slate-300 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Key className="w-4 h-4" />
                </span>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-3 py-2.5 rounded-lg text-sm bg-navy-800 border border-navy-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${inputFocusStyles[activeRole]}`}
                  placeholder="••••••••" />
              </div>
              
              {/* Reset link or click-to-autofill option if cleared */}
              {(!email || !password) && (
                <div className="flex justify-end mt-1.5">
                  <button 
                    type="button"
                    onClick={() => {
                      setEmail(demoCredentials[activeRole].email);
                      setPassword(demoCredentials[activeRole].password);
                    }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Use {activeRole} Demo Preset
                  </button>
                </div>
              )}
            </div>

            {error && <div className="text-[12.5px] text-red-300 mb-3">{error}</div>}
            
            <button disabled={loading} type="submit"
              className={`w-full py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-60 transition-all ${buttonStyles[activeRole]}`}>
              {loading ? 'Signing in…' : `Sign In as ${activeRole}`}
            </button>
          </form>
        )}

        <div className="flex justify-between mt-5 text-[13px] border-t border-navy-800/80 pt-4">
          <Link to="/forgot-password" className="text-slate-400 hover:text-white transition-colors">Forgot password?</Link>
          <Link to="/signup" className="text-slate-400 hover:text-white transition-colors">Create account</Link>
        </div>
      </div>
    </div>
  );
}
