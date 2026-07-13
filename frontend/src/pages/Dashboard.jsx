// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { supabase } from '../lib/supabaseClient';
import { attachRisk } from '../utils/riskEngine';
import { StatCard } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { filterEmployees, filterProjects, filterNotifications } from '../utils/authFilters';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [{ data: projects }, { data: employees }, { data: clients }] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('employees').select('*, profiles(role)'),
        supabase.from('clients').select('id'),
      ]);

      const visibleEmployees = filterEmployees(employees || [], user);
      const visibleProjects = filterProjects(projects || [], employees || [], user);
      const withRisk = attachRisk(visibleProjects, employees || []);

      const statusCounts = { Active: 0, Completed: 0, Delayed: 0, 'On Hold': 0 };
      const riskCounts = { Low: 0, Medium: 0, High: 0 };
      withRisk.forEach((p) => {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
        if (p.risk && p.risk.level) {
          riskCounts[p.risk.level] = (riskCounts[p.risk.level] || 0) + 1;
        }
      });

      // --- Live Notifications Generator ---
      let generatedNew = false;

      // 1. Workload Alerts
      if (user?.deadline_reminders !== false) { // map to matching settings
        if (user?.workload_alerts !== false) {
          for (const emp of visibleEmployees || []) {
            if (emp.workload === 'Overloaded' || Number(emp.weekly_hours) > 40) {
              const title = `Workload Alert: ${emp.name}`;
              const message = `${emp.name} is overloaded with ${emp.weekly_hours} hours/week.`;
              const { data: exists } = await supabase.from('notifications').select('id').eq('title', title).limit(1);
              if (!exists || exists.length === 0) {
                await supabase.from('notifications').insert({ type: 'warn', title, message });
                generatedNew = true;
              }
            }
          }
        }
      }

      // 2. High-Risk Warnings
      if (user?.high_risk_warnings !== false) {
        for (const p of withRisk) {
          if (p.risk.level === 'High') {
            const title = `High-Risk Alert: ${p.name}`;
            const message = `${p.name} is classified as High Risk: ${p.risk.reasons.join('; ')}`;
            const { data: exists } = await supabase.from('notifications').select('id').eq('title', title).limit(1);
            if (!exists || exists.length === 0) {
              await supabase.from('notifications').insert({ type: 'risk', title, message });
              generatedNew = true;
            }
          }
        }
      }

      // 3. Deadline Reminders
      if (user?.deadline_reminders !== false) {
        for (const p of visibleProjects || []) {
          if (p.status !== 'Completed' && p.end_date) {
            const diffTime = new Date(p.end_date) - new Date();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 7) {
              const title = `Deadline Reminder: ${p.name}`;
              const message = `${p.name} is approaching its deadline on ${p.end_date}.`;
              const { data: exists } = await supabase.from('notifications').select('id').eq('title', title).limit(1);
              if (!exists || exists.length === 0) {
                await supabase.from('notifications').insert({ type: 'update', title, message });
                generatedNew = true;
              }
            }
          }
        }
      }

      // Fetch latest notifications list
      const { data: notifs } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
      const filteredNotifs = filterNotifications(notifs || [], visibleProjects, visibleEmployees);

      const visibleClientIds = new Set(visibleProjects.map(p => p.client_id).filter(Boolean));
      const totalClientsCount = (clients || []).filter(c => visibleClientIds.has(c.id)).length;

      setStats({
        totalProjects: visibleProjects.length,
        activeProjects: statusCounts.Active,
        completedProjects: statusCounts.Completed,
        delayedProjects: statusCounts.Delayed,
        highRiskProjects: riskCounts.High,
        totalClients: user.role === 'Admin' ? (clients || []).length : totalClientsCount,
        totalEmployees: visibleEmployees.length,
        statusCounts,
        riskCounts,
      });
      setNotifications(filteredNotifs.slice(0, 5));
    })();
  }, [user]);

  if (!stats) return <div className="text-slate-400">Loading dashboard…</div>;

  const goToProjects = (status) => () => navigate('/projects', { state: { statusFilter: status } });

  const cards = [
    { label: 'Total Projects', value: stats.totalProjects, accent: '#3E6FD9', onClick: () => navigate('/projects'), roles: ['Admin', 'Project Manager', 'Employee'] },
    { label: 'Active Projects', value: stats.activeProjects, accent: '#0F6E7C', onClick: goToProjects('Active'), roles: ['Admin', 'Project Manager', 'Employee'] },
    { label: 'Completed Projects', value: stats.completedProjects, accent: '#2E9E5B', onClick: goToProjects('Completed'), roles: ['Admin', 'Project Manager', 'Employee'] },
    { label: 'Delayed Projects', value: stats.delayedProjects, accent: '#D5514C', onClick: goToProjects('Delayed'), roles: ['Admin', 'Project Manager', 'Employee'] },
    { label: 'High-Risk Projects', value: stats.highRiskProjects, accent: '#E2A33D', onClick: () => navigate('/risk'), roles: ['Admin', 'Project Manager'] },
    { label: 'Total Clients', value: stats.totalClients, accent: '#7C5CD9', onClick: () => navigate('/clients'), roles: ['Admin', 'Project Manager'] },
    { label: 'Total Employees', value: stats.totalEmployees, accent: '#1B2436', onClick: () => navigate('/employees'), roles: ['Admin', 'Project Manager', 'Employee'] },
  ].filter(c => c.roles.includes(user?.role));

  const statusData = {
    labels: Object.keys(stats.statusCounts),
    datasets: [{ data: Object.values(stats.statusCounts), backgroundColor: ['#0F6E7C', '#2E9E5B', '#D5514C', '#93A0B8'], borderRadius: 6 }],
  };
  const riskData = {
    labels: ['Low Risk', 'Medium Risk', 'High Risk'],
    datasets: [{ data: [stats.riskCounts.Low, stats.riskCounts.Medium, stats.riskCounts.High], backgroundColor: ['#2E9E5B', '#E2A33D', '#D5514C'] }],
  };

  return (
    <div>
      <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {cards.map(c => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm">
          <div className="font-semibold text-[15px]">Projects by Status</div>
          <div className="text-[12.5px] text-slate-500 mb-3">Live snapshot from Supabase</div>
          <Bar data={statusData} options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} height={200} />
        </div>
        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm">
          <div className="font-semibold text-[15px]">Risk Distribution</div>
          <div className="text-[12.5px] text-slate-500 mb-3">AI-classified risk across all projects</div>
          <Doughnut data={riskData} options={{ plugins: { legend: { position: 'bottom' } } }} height={200} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="font-semibold text-[15px]">Recent Notifications</div>
            <div className="text-[12.5px] text-slate-500">Swipe to browse the latest updates</div>
          </div>
          <button onClick={() => navigate('/notifications')} className="text-[12.5px] font-semibold text-teal">View all</button>
        </div>
        <div className="notif-scroll flex gap-3.5 overflow-x-auto pb-2 pt-1">
          {notifications.map(n => (
            <div key={n.id} className={`flex-none w-[280px] bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm border-l-4`}
              style={{ borderLeftColor: n.type === 'risk' ? '#D5514C' : n.type === 'warn' ? '#E2A33D' : '#0F6E7C' }}>
              <div className="text-[10.5px] uppercase tracking-wide text-slate-500 mb-1.5">{n.title}</div>
              <div className="text-[13.5px] leading-snug mb-2">{n.message}</div>
              <div className="text-[11px] text-slate-400">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
          {!notifications.length && <div className="text-slate-400 text-sm py-4">No notifications yet.</div>}
        </div>
      </div>
    </div>
  );
}

