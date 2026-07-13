import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { Pill, StatCard, toast } from '../components/UI';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { filterProjects } from '../utils/authFilters';

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'];
const DELIVERABLE_STATUSES = ['Not Started', 'In Progress', 'Done', 'Blocked'];
const SCHEDULE_STATUSES = ['On Track', 'At Risk', 'Delayed'];
const ACTIVITY_STATUSES = ['Not Started', 'In Progress', 'Done', 'Blocked'];

const EMPTY_OUTCOME = {
  project_id: '',
  outcome_code: '',
  title: '',
  description: '',
  definition_of_done: '',
  requested_date: '',
  tshirt_size: 'M',
  due_date: '',
  effort_version: 'Original',
  approval_status: 'Pending',
  approved_effort: '',
  actual_hours: '',
  deliverable_status: 'Not Started',
  planned_start: '',
  forecast_end: '',
  completion_date: '',
  is_active: true,
  approval_date: '',
  schedule_status: 'On Track',
  remaining_hours: '',
  eac_hours: '',
  percent_complete: 0,
};

const EMPTY_ACTIVITY = {
  outcome_id: '',
  effort_version: 'Original',
  activity: '',
  application: '',
  assignee: '',
  workstream: 'Technical',
  estimated_effort_hours: '',
  actuals_hours: '',
  status: 'Not Started',
  planned_start: '',
  work_days: '',
  forecast_end: '',
  completion_date: '',
  proj_start: '',
  cum_hours: '',
};

const toNumber = (value) => (value === '' || value === null || value === undefined ? null : Number(value));
const scheduleTone = (value) => ({
  'On Track': 'green',
  'Delivered On Time': 'green',
  'At Risk': 'amber',
  'No Due Date': 'gray',
  'Delivered Late': 'red',
  'Delayed': 'red'
}[value] || 'gray');
const deliverableTone = (value) => ({ 'Not Started': 'gray', 'In Progress': 'blue', Done: 'green', Blocked: 'red' }[value] || 'gray');
const approvalTone = (value) => ({ Pending: 'amber', Approved: 'green', Rejected: 'red' }[value] || 'gray');

const calculateOutcomeRollup = (outcome, outcomeActivities) => {
  const acts = outcomeActivities || [];
  const approved_effort = acts.reduce((sum, a) => sum + (Number(a.estimated_effort_hours) || 0), 0);
  const actual_hours = acts.reduce((sum, a) => sum + (Number(a.actuals_hours) || 0), 0);

  let deliverable_status = 'Not Started';
  if (acts.length > 0) {
    const totalActs = acts.length;
    const doneActs = acts.filter((a) => a.status === 'Done').length;
    const blockedActs = acts.filter((a) => a.status === 'Blocked').length;
    const wipActs = acts.filter((a) => a.status === 'In Progress' || a.status === 'Blocked' || a.status === 'Done' || (Number(a.actuals_hours) || 0) > 0).length;

    if (doneActs === totalActs) {
      deliverable_status = 'Done';
    } else if (blockedActs > 0) {
      deliverable_status = 'Blocked';
    } else if (wipActs > 0) {
      deliverable_status = 'In Progress';
    }
  }

  const forecast_end = acts.reduce((max, a) => {
    if (!a.forecast_end) return max;
    if (!max) return a.forecast_end;
    return a.forecast_end > max ? a.forecast_end : max;
  }, null);

  const allDone = acts.length > 0 && acts.every((a) => a.status === 'Done');
  const completion_date = allDone
    ? acts.reduce((max, a) => {
        if (!a.completion_date) return max;
        if (!max) return a.completion_date;
        return a.completion_date > max ? a.completion_date : max;
      }, null)
    : null;

  const remaining_hours = acts
    .filter((a) => a.status !== 'Done')
    .reduce((sum, a) => sum + (Number(a.estimated_effort_hours) || 0), 0);

  const eac_hours = actual_hours + remaining_hours;

  const percent_complete = approved_effort > 0
    ? Math.round(((approved_effort - remaining_hours) / approved_effort) * 100)
    : 0;

  let schedule_status = 'On Track';
  const targetForecastEnd = forecast_end || outcome.forecast_end;
  const targetDueDate = outcome.due_date;
  const targetCompletionDate = completion_date || outcome.completion_date;

  if (targetForecastEnd && targetDueDate) {
    if (targetCompletionDate) {
      schedule_status = targetCompletionDate <= targetDueDate ? 'Delivered On Time' : 'Delivered Late';
    } else {
      schedule_status = targetForecastEnd <= targetDueDate ? 'On Track' : 'At Risk';
    }
  } else {
    schedule_status = 'No Due Date';
  }

  return {
    approved_effort,
    actual_hours,
    deliverable_status,
    forecast_end,
    completion_date,
    remaining_hours,
    eac_hours,
    percent_complete,
    schedule_status,
  };
};

export default function Outcomes() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState('');
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingOutcomeId, setEditingOutcomeId] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [outcomeForm, setOutcomeForm] = useState(EMPTY_OUTCOME);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);

  const load = async () => {
    const [{ data: projectRows }, { data: outcomeRows }, { data: activityRows }, { data: employeeRows }] = await Promise.all([
      supabase.from('projects').select('id, name, project_code, assigned_employees').order('name'),
      supabase.from('project_outcomes').select('*').order('created_at', { ascending: false }),
      supabase.from('outcome_activities').select('*').order('created_at', { ascending: false }),
      supabase.from('employees').select('*, profiles(role)'),
    ]);

    const visibleProjects = filterProjects(projectRows || [], employeeRows || [], user);
    const visibleProjectIds = new Set(visibleProjects.map(p => p.id));

    const visibleOutcomes = (outcomeRows || []).filter(o => visibleProjectIds.has(o.project_id));
    const visibleOutcomeIds = new Set(visibleOutcomes.map(o => o.id));

    const visibleActivities = (activityRows || []).filter(a => visibleOutcomeIds.has(a.outcome_id));

    setProjects(visibleProjects);
    setOutcomes(visibleOutcomes);
    setActivities(visibleActivities);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!outcomes.length) {
      setSelectedOutcomeId('');
      return;
    }
    if (!selectedOutcomeId || !outcomes.some((outcome) => String(outcome.id) === String(selectedOutcomeId))) {
      setSelectedOutcomeId(String(outcomes[0].id));
    }
  }, [outcomes, selectedOutcomeId]);

  useEffect(() => {
    if (outcomeModalOpen && !editingOutcomeId && outcomeForm.project_id) {
      buildOutcomeCode(outcomeForm.project_id).then((code) => {
        setOutcomeForm((prev) => (prev.project_id === outcomeForm.project_id && !editingOutcomeId ? { ...prev, outcome_code: code } : prev));
      });
    }
    if (outcomeModalOpen && !editingOutcomeId && !outcomeForm.project_id) {
      setOutcomeForm((prev) => ({ ...prev, outcome_code: '' }));
    }
  }, [outcomeForm.project_id, outcomeModalOpen, editingOutcomeId]);

  const selectedOutcome = useMemo(
    () => outcomes.find((outcome) => String(outcome.id) === String(selectedOutcomeId)) || null,
    [outcomes, selectedOutcomeId]
  );

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((project) => [String(project.id), project])),
    [projects]
  );

  const filteredOutcomes = useMemo(() => outcomes.filter((outcome) => {
    const project = projectMap[String(outcome.project_id)];
    const haystack = [
      outcome.outcome_code,
      outcome.title,
      outcome.description,
      project?.name,
      project?.project_code,
    ].join(' ').toLowerCase();

    return (!search || haystack.includes(search.toLowerCase()))
      && (!projectFilter || String(outcome.project_id) === String(projectFilter))
      && (!statusFilter || outcome.deliverable_status === statusFilter);
  }), [outcomes, projectFilter, search, statusFilter, projectMap]);

  const selectedActivities = useMemo(
    () => activities.filter((activity) => String(activity.outcome_id) === String(selectedOutcomeId)),
    [activities, selectedOutcomeId]
  );

  const stats = useMemo(() => {
    const total = outcomes.length;
    const completed = outcomes.filter((outcome) => Number(outcome.percent_complete) >= 100 || outcome.deliverable_status === 'Done').length;
    const atRisk = outcomes.filter((outcome) => outcome.schedule_status === 'At Risk').length;
    const active = outcomes.filter((outcome) => outcome.is_active !== false).length;
    const progress = total ? Math.round(outcomes.reduce((sum, outcome) => sum + Number(outcome.percent_complete || 0), 0) / total) : 0;

    return { total, completed, atRisk, active, progress };
  }, [outcomes]);

  const buildOutcomeCode = async (projectId) => {
    const project = projects.find((item) => String(item.id) === String(projectId));
    if (!project) return '';

    const { count } = await supabase
      .from('project_outcomes')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);

    return `${project.project_code || 'OUT'}-${String((count || 0) + 1).padStart(3, '0')}`;
  };

  const openNewOutcome = () => {
    setEditingOutcomeId(null);
    setOutcomeForm({ ...EMPTY_OUTCOME, project_id: projects[0]?.id ? String(projects[0].id) : '' });
    setOutcomeModalOpen(true);
  };

  const openEditOutcome = (outcome) => {
    setEditingOutcomeId(outcome.id);
    setOutcomeForm({
      project_id: String(outcome.project_id || ''),
      outcome_code: outcome.outcome_code || '',
      title: outcome.title || '',
      description: outcome.description || '',
      definition_of_done: outcome.definition_of_done || '',
      requested_date: outcome.requested_date || '',
      tshirt_size: outcome.tshirt_size || 'M',
      due_date: outcome.due_date || '',
      effort_version: outcome.effort_version || 'Original',
      approval_status: outcome.approval_status || 'Pending',
      approved_effort: outcome.approved_effort ?? '',
      actual_hours: outcome.actual_hours ?? '',
      deliverable_status: outcome.deliverable_status || 'Not Started',
      planned_start: outcome.planned_start || '',
      forecast_end: outcome.forecast_end || '',
      completion_date: outcome.completion_date || '',
      is_active: outcome.is_active !== false,
      approval_date: outcome.approval_date || '',
      schedule_status: outcome.schedule_status || 'On Track',
      remaining_hours: outcome.remaining_hours ?? '',
      eac_hours: outcome.eac_hours ?? '',
      percent_complete: outcome.percent_complete ?? 0,
    });
    setOutcomeModalOpen(true);
  };

  const saveOutcome = async () => {
    if (!outcomeForm.project_id || !outcomeForm.title.trim()) {
      toast('Project and title are required.');
      return;
    }

    let outcomeCode = outcomeForm.outcome_code;
    if (!editingOutcomeId && !outcomeCode) {
      outcomeCode = await buildOutcomeCode(outcomeForm.project_id);
    }

    const outcomeActs = editingOutcomeId 
      ? activities.filter(a => String(a.outcome_id) === String(editingOutcomeId) && a.effort_version === outcomeForm.effort_version)
      : [];
    
    const hasActs = outcomeActs.length > 0;
    const computed = calculateOutcomeRollup({ ...outcomeForm, id: editingOutcomeId }, outcomeActs);
    
    let dbScheduleStatus = 'On Track';
    const finalScheduleStatus = hasActs ? computed.schedule_status : outcomeForm.schedule_status;
    if (finalScheduleStatus === 'Delivered Late') {
      dbScheduleStatus = 'Delayed';
    } else if (finalScheduleStatus === 'At Risk') {
      dbScheduleStatus = 'At Risk';
    } else {
      dbScheduleStatus = 'On Track';
    }

    const payload = {
      project_id: Number(outcomeForm.project_id),
      outcome_code: outcomeCode,
      title: outcomeForm.title.trim(),
      description: outcomeForm.description.trim(),
      definition_of_done: outcomeForm.definition_of_done.trim(),
      requested_date: outcomeForm.requested_date || null,
      tshirt_size: outcomeForm.tshirt_size || null,
      due_date: outcomeForm.due_date || null,
      effort_version: outcomeForm.effort_version,
      approval_status: outcomeForm.approval_status,
      approved_effort: hasActs ? computed.approved_effort : toNumber(outcomeForm.approved_effort),
      actual_hours: hasActs ? computed.actual_hours : toNumber(outcomeForm.actual_hours),
      deliverable_status: hasActs ? computed.deliverable_status : outcomeForm.deliverable_status,
      planned_start: outcomeForm.planned_start || null,
      forecast_end: hasActs ? computed.forecast_end : (outcomeForm.forecast_end || null),
      completion_date: hasActs ? computed.completion_date : (outcomeForm.completion_date || null),
      is_active: outcomeForm.is_active,
      approval_date: outcomeForm.approval_date || null,
      schedule_status: dbScheduleStatus,
      remaining_hours: hasActs ? computed.remaining_hours : toNumber(outcomeForm.remaining_hours),
      eac_hours: hasActs ? computed.eac_hours : toNumber(outcomeForm.eac_hours),
      percent_complete: hasActs ? computed.percent_complete : Number(outcomeForm.percent_complete || 0),
    };

    const { error } = editingOutcomeId
      ? await supabase.from('project_outcomes').update(payload).eq('id', editingOutcomeId)
      : await supabase.from('project_outcomes').insert(payload);

    if (error) {
      toast(error.message);
      return;
    }

    setOutcomeModalOpen(false);
    setEditingOutcomeId(null);
    setOutcomeForm(EMPTY_OUTCOME);
    toast(editingOutcomeId ? 'Outcome updated.' : 'Outcome created.');
    load();
  };

  const removeOutcome = async (id) => {
    if (!confirm('Delete this outcome and its activity breakdown?')) return;
    const { error } = await supabase.from('project_outcomes').delete().eq('id', id);
    if (error) {
      toast(error.message);
      return;
    }
    if (String(selectedOutcomeId) === String(id)) setSelectedOutcomeId('');
    toast('Outcome deleted.');
    load();
  };

  const openNewActivity = (outcomeId = selectedOutcomeId) => {
    setEditingActivityId(null);
    setActivityForm({ ...EMPTY_ACTIVITY, outcome_id: String(outcomeId || outcomes[0]?.id || '') });
    setActivityModalOpen(true);
  };

  const openEditActivity = (activity) => {
    setEditingActivityId(activity.id);
    setActivityForm({
      outcome_id: String(activity.outcome_id || ''),
      effort_version: activity.effort_version || 'Original',
      activity: activity.activity || '',
      application: activity.application || '',
      assignee: activity.assignee || '',
      workstream: activity.workstream || 'Technical',
      estimated_effort_hours: activity.estimated_effort_hours ?? '',
      actuals_hours: activity.actuals_hours ?? '',
      status: activity.status || 'Not Started',
      planned_start: activity.planned_start || '',
      work_days: activity.work_days ?? '',
      forecast_end: activity.forecast_end || '',
      completion_date: activity.completion_date || '',
      proj_start: activity.proj_start || '',
      cum_hours: activity.cum_hours ?? '',
    });
    setActivityModalOpen(true);
  };

  const syncOutcomeRollup = async (outcomeId, outcomeActs) => {
    const outcome = outcomes.find(o => String(o.id) === String(outcomeId));
    if (!outcome) return;

    const computed = calculateOutcomeRollup(outcome, outcomeActs || []);

    let dbScheduleStatus = 'On Track';
    if (computed.schedule_status === 'Delivered Late') {
      dbScheduleStatus = 'Delayed';
    } else if (computed.schedule_status === 'At Risk') {
      dbScheduleStatus = 'At Risk';
    } else {
      dbScheduleStatus = 'On Track';
    }

    const payload = {
      approved_effort: computed.approved_effort,
      actual_hours: computed.actual_hours,
      deliverable_status: computed.deliverable_status,
      forecast_end: computed.forecast_end,
      completion_date: computed.completion_date,
      schedule_status: dbScheduleStatus,
      remaining_hours: computed.remaining_hours,
      eac_hours: computed.eac_hours,
      percent_complete: computed.percent_complete,
    };

    await supabase.from('project_outcomes').update(payload).eq('id', outcomeId);
  };

  const saveActivity = async () => {
    if (!activityForm.outcome_id || !activityForm.activity.trim()) {
      toast('Outcome and activity are required.');
      return;
    }

    const payload = {
      outcome_id: Number(activityForm.outcome_id),
      effort_version: activityForm.effort_version,
      activity: activityForm.activity.trim(),
      application: activityForm.application.trim(),
      assignee: activityForm.assignee.trim(),
      workstream: activityForm.workstream,
      estimated_effort_hours: toNumber(activityForm.estimated_effort_hours),
      actuals_hours: toNumber(activityForm.actuals_hours),
      status: activityForm.status,
      planned_start: activityForm.planned_start || null,
      work_days: toNumber(activityForm.work_days),
      forecast_end: activityForm.forecast_end || null,
      completion_date: activityForm.completion_date || null,
      proj_start: activityForm.proj_start || null,
      cum_hours: toNumber(activityForm.cum_hours),
    };

    const { error } = editingActivityId
      ? await supabase.from('outcome_activities').update(payload).eq('id', editingActivityId)
      : await supabase.from('outcome_activities').insert(payload);

    if (error) {
      toast(error.message);
      return;
    }

    // Load latest activities for this outcome and sync rollup
    const { data: outcomeActs } = await supabase.from('outcome_activities').select('*').eq('outcome_id', payload.outcome_id);
    await syncOutcomeRollup(payload.outcome_id, outcomeActs || []);

    setActivityModalOpen(false);
    setEditingActivityId(null);
    setActivityForm(EMPTY_ACTIVITY);
    toast(editingActivityId ? 'Activity updated.' : 'Activity saved.');
    load();
  };

  const removeActivity = async (id) => {
    const act = activities.find(a => a.id === id);
    if (!act) return;
    if (!confirm('Delete this activity row?')) return;
    const { error } = await supabase.from('outcome_activities').delete().eq('id', id);
    if (error) {
      toast(error.message);
      return;
    }

    // Load latest activities for this outcome and sync rollup
    const { data: outcomeActs } = await supabase.from('outcome_activities').select('*').eq('outcome_id', act.outcome_id);
    await syncOutcomeRollup(act.outcome_id, outcomeActs || []);

    toast('Activity deleted.');
    load();
  };

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-semibold text-[15px] flex items-center gap-2">
            <ClipboardList size={16} strokeWidth={2} className="text-teal" /> Project Outcomes
          </div>
          <div className="text-[12.5px] text-slate-500 max-w-2xl">
            Track outcome IDs, due dates, approvals, completion status, and WBS-style activity breakdowns in one place, aligned with the Excel template.
          </div>
        </div>
        <button onClick={openNewOutcome} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-light">
          <Plus size={15} strokeWidth={2} /> New Outcome
        </button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full max-w-full">
        <StatCard label="Total Outcomes" value={stats.total} accent="#3E6FD9" />
        <StatCard label="Active Outcomes" value={stats.active} accent="#0F6E7C" />
        <StatCard label="Completed" value={stats.completed} accent="#2E9E5B" />
        <StatCard label="At Risk" value={stats.atRisk} accent="#E2A33D" />
        <StatCard label="Avg. Completion" value={`${stats.progress}%`} accent="#D5514C" />
      </div>

      <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap gap-2.5 items-center justify-between mb-3">
          <div className="flex flex-wrap gap-2.5">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search outcome, project or code…" className="px-3 py-2 rounded-lg text-[13px] border border-slate-200 min-w-[240px]" />
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="px-2.5 py-2 rounded-lg text-[13px] border border-slate-200">
              <option value="">All Projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} - {project.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2.5 py-2 rounded-lg text-[13px] border border-slate-200">
              <option value="">All Deliverable Status</option>
              {DELIVERABLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="text-[12px] text-slate-500">Click a row to focus its activity breakdown.</div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="excel-grid">
            <thead>
              <tr>
                {[
                  'Project Code',
                  'Outcome ID',
                  'Title',
                  'Description',
                  'Definition of Done',
                  'Requested Date',
                  'T-Shirt Size',
                  'Due Date',
                  'Effort Version',
                  'Approval Status',
                  'Approved Effort',
                  'Actual Hrs (to date)',
                  'Deliverable Status',
                  'Planned Start',
                  'Forecast End',
                  'Completion Date',
                  'Is Active',
                  'Approval Date',
                  'Schedule Status',
                  'Remaining (est.)',
                  'EAC (hrs)',
                  '% Complete',
                  'Actions'
                ].map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOutcomes.map((outcome) => {
                const project = projectMap[String(outcome.project_id)];
                const isSelected = String(selectedOutcomeId) === String(outcome.id);
                const outcomeActs = activities.filter(
                  (a) => String(a.outcome_id) === String(outcome.id) && a.effort_version === outcome.effort_version
                );
                const computed = calculateOutcomeRollup(outcome, outcomeActs);

                return (
                  <tr
                    key={outcome.id}
                    onClick={() => setSelectedOutcomeId(String(outcome.id))}
                    className={`cursor-pointer ${isSelected ? 'bg-teal-50/60 font-semibold' : ''}`}
                  >
                    <td>{project?.project_code || '—'}</td>
                    <td className="font-mono">{outcome.outcome_code}</td>
                    <td className="font-semibold">{outcome.title}</td>
                    <td className="max-w-[200px] truncate" title={outcome.description}>{outcome.description || '—'}</td>
                    <td className="max-w-[200px] truncate" title={outcome.definition_of_done}>{outcome.definition_of_done || '—'}</td>
                    <td>{outcome.requested_date || '—'}</td>
                    <td className="text-center font-mono">{outcome.tshirt_size || '—'}</td>
                    <td>{outcome.due_date || '—'}</td>
                    <td>{outcome.effort_version}</td>
                    <td><Pill tone={approvalTone(outcome.approval_status)}>{outcome.approval_status}</Pill></td>
                    <td className="text-right">{computed.approved_effort}</td>
                    <td className="text-right">{computed.actual_hours}</td>
                    <td><Pill tone={deliverableTone(computed.deliverable_status)}>{computed.deliverable_status}</Pill></td>
                    <td>{outcome.planned_start || '—'}</td>
                    <td>{computed.forecast_end || '—'}</td>
                    <td>{computed.completion_date || '—'}</td>
                    <td className="text-center">{outcome.is_active !== false ? 'Yes' : 'No'}</td>
                    <td>{outcome.approval_date || '—'}</td>
                    <td><Pill tone={scheduleTone(computed.schedule_status)}>{computed.schedule_status}</Pill></td>
                    <td className="text-right">{computed.remaining_hours}</td>
                    <td className="text-right">{computed.eac_hours}</td>
                    <td className="text-right font-medium">{computed.percent_complete}%</td>
                    <td>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditOutcome(outcome)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => removeOutcome(outcome.id)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filteredOutcomes.length && (
                <tr><td colSpan={23} className="text-center text-slate-400 py-10">No outcomes match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 w-full max-w-full">
        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div>
              <div className="font-semibold text-[15px]">Activity Breakdown</div>
              <div className="text-[12.5px] text-slate-500">
                {selectedOutcome ? `${selectedOutcome.outcome_code} · ${selectedOutcome.title}` : 'Select an outcome to view its WBS rows.'}
              </div>
            </div>
            <button onClick={() => openNewActivity(selectedOutcomeId)} disabled={!selectedOutcomeId} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal text-white text-[12.5px] font-semibold hover:bg-teal-light disabled:opacity-60">
              <Plus size={14} strokeWidth={2} /> Add Activity
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg w-full max-w-full">
            <table className="excel-grid">
              <thead>
                <tr>
                  {[
                    'Activity',
                    'Application',
                    'Assignee',
                    'Workstream',
                    'Est. Effort (hrs)',
                    'Actuals (hrs)',
                    'Status',
                    'Planned Start',
                    'Work Days',
                    'Forecast End',
                    'Completion Date',
                    'Proj Start',
                    'Cum Hrs',
                    'Actions'
                  ].map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="min-w-[240px] whitespace-normal leading-normal">{activity.activity}</td>
                    <td>{activity.application || '—'}</td>
                    <td>{activity.assignee || '—'}</td>
                    <td>{activity.workstream || '—'}</td>
                    <td className="text-right">{activity.estimated_effort_hours ?? '—'}</td>
                    <td className="text-right">{activity.actuals_hours ?? '—'}</td>
                    <td><Pill tone={deliverableTone(activity.status)}>{activity.status}</Pill></td>
                    <td>{activity.planned_start || '—'}</td>
                    <td className="text-right">{activity.work_days ?? '—'}</td>
                    <td>{activity.forecast_end || '—'}</td>
                    <td>{activity.completion_date || '—'}</td>
                    <td>{activity.proj_start || '—'}</td>
                    <td className="text-right">{activity.cum_hours ?? '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditActivity(activity)} className="p-1 rounded hover:bg-slate-200 text-slate-500"><Pencil size={13} /></button>
                        <button onClick={() => removeActivity(activity.id)} className="p-1 rounded hover:bg-slate-200 text-slate-500"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!selectedActivities.length && (
                  <tr><td colSpan={14} className="text-center text-slate-400 py-10">No activities logged for this outcome yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[10px] p-4 shadow-sm w-full max-w-full overflow-hidden">
          <div className="font-semibold text-[15px] flex items-center gap-2 mb-2.5">
            <Target size={16} strokeWidth={2} className="text-teal" /> Outcome Details
          </div>
          {selectedOutcome ? (
            <div className="space-y-3 text-[13px]">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Description</div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedOutcome.description || 'No description provided.'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Definition of Done</div>
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedOutcome.definition_of_done || 'No definition of done provided.'}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                <div><div className="text-slate-500">Requested</div><div className="font-medium">{selectedOutcome.requested_date || '—'}</div></div>
                <div><div className="text-slate-500">Approved</div><div className="font-medium">{selectedOutcome.approval_date || '—'}</div></div>
                <div><div className="text-slate-500">Planned Start</div><div className="font-medium">{selectedOutcome.planned_start || '—'}</div></div>
                <div><div className="text-slate-500">Forecast End</div><div className="font-medium">{selectedOutcome.forecast_end || '—'}</div></div>
                <div><div className="text-slate-500">Approved Effort</div><div className="font-medium">{selectedOutcome.approved_effort ?? '—'}</div></div>
                <div><div className="text-slate-500">Actual Hours</div><div className="font-medium">{selectedOutcome.actual_hours ?? '—'}</div></div>
                <div><div className="text-slate-500">Remaining</div><div className="font-medium">{selectedOutcome.remaining_hours ?? '—'}</div></div>
                <div><div className="text-slate-500">EAC</div><div className="font-medium">{selectedOutcome.eac_hours ?? '—'}</div></div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Pill tone={approvalTone(selectedOutcome.approval_status)}>{selectedOutcome.approval_status}</Pill>
                <Pill tone={deliverableTone(selectedOutcome.deliverable_status)}>{selectedOutcome.deliverable_status}</Pill>
                <Pill tone={scheduleTone(selectedOutcome.schedule_status)}>{selectedOutcome.schedule_status}</Pill>
                <Pill tone={selectedOutcome.is_active === false ? 'gray' : 'blue'}>{selectedOutcome.is_active === false ? 'Inactive' : 'Active'}</Pill>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-slate-400 py-6">No outcome selected.</div>
          )}
        </div>
      </div>

      <Modal
        open={outcomeModalOpen}
        onClose={() => setOutcomeModalOpen(false)}
        title={`${editingOutcomeId ? 'Edit' : 'New'} Outcome`}
        subtitle="Fields mirror the Excel outcome template so project tracking stays familiar."
        footer={(
          <>
            <button onClick={() => setOutcomeModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
            <button onClick={saveOutcome} className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold">Save Outcome</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Project">
            <select className="in" value={outcomeForm.project_id} onChange={(e) => setOutcomeForm({ ...outcomeForm, project_id: e.target.value })}>
              <option value="">— Select —</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} - {project.name}</option>)}
            </select>
          </Field>
          <Field label="Outcome ID">
            <input className="in" value={outcomeForm.outcome_code} readOnly placeholder="Auto-generated from project code" />
          </Field>
          <Field label="Title" full><input className="in" value={outcomeForm.title} onChange={(e) => setOutcomeForm({ ...outcomeForm, title: e.target.value })} /></Field>
          <Field label="Description" full><textarea className="in" rows={3} value={outcomeForm.description} onChange={(e) => setOutcomeForm({ ...outcomeForm, description: e.target.value })} /></Field>
          <Field label="Definition of Done" full><textarea className="in" rows={4} value={outcomeForm.definition_of_done} onChange={(e) => setOutcomeForm({ ...outcomeForm, definition_of_done: e.target.value })} /></Field>
          <Field label="Requested Date"><input type="date" className="in" value={outcomeForm.requested_date || ''} onChange={(e) => setOutcomeForm({ ...outcomeForm, requested_date: e.target.value })} /></Field>
          <Field label="Due Date"><input type="date" className="in" value={outcomeForm.due_date || ''} onChange={(e) => setOutcomeForm({ ...outcomeForm, due_date: e.target.value })} /></Field>
          <Field label="Planned Start"><input type="date" className="in" value={outcomeForm.planned_start || ''} onChange={(e) => setOutcomeForm({ ...outcomeForm, planned_start: e.target.value })} /></Field>
          <Field label="Forecast End"><input type="date" className="in" value={outcomeForm.forecast_end || ''} onChange={(e) => setOutcomeForm({ ...outcomeForm, forecast_end: e.target.value })} /></Field>
          <Field label="Completion Date"><input type="date" className="in" value={outcomeForm.completion_date || ''} onChange={(e) => setOutcomeForm({ ...outcomeForm, completion_date: e.target.value })} /></Field>
          <Field label="Approval Date"><input type="date" className="in" value={outcomeForm.approval_date || ''} onChange={(e) => setOutcomeForm({ ...outcomeForm, approval_date: e.target.value })} /></Field>
          <Field label="T-Shirt Size">
            <select className="in" value={outcomeForm.tshirt_size} onChange={(e) => setOutcomeForm({ ...outcomeForm, tshirt_size: e.target.value })}>
              {SHIRT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </Field>
          <Field label="Effort Version">
            <select className="in" value={outcomeForm.effort_version} onChange={(e) => setOutcomeForm({ ...outcomeForm, effort_version: e.target.value })}>
              <option>Original</option>
              <option>Revised</option>
            </select>
          </Field>
          <Field label="Approval Status">
            <select className="in" value={outcomeForm.approval_status} onChange={(e) => setOutcomeForm({ ...outcomeForm, approval_status: e.target.value })}>
              {APPROVAL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Deliverable Status">
            <select className="in" value={outcomeForm.deliverable_status} onChange={(e) => setOutcomeForm({ ...outcomeForm, deliverable_status: e.target.value })}>
              {DELIVERABLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Schedule Status">
            <select className="in" value={outcomeForm.schedule_status} onChange={(e) => setOutcomeForm({ ...outcomeForm, schedule_status: e.target.value })}>
              {SCHEDULE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Approved Effort"><input type="number" className="in" value={outcomeForm.approved_effort} onChange={(e) => setOutcomeForm({ ...outcomeForm, approved_effort: e.target.value })} /></Field>
          <Field label="Actual Hours"><input type="number" className="in" value={outcomeForm.actual_hours} onChange={(e) => setOutcomeForm({ ...outcomeForm, actual_hours: e.target.value })} /></Field>
          <Field label="Remaining"><input type="number" className="in" value={outcomeForm.remaining_hours} onChange={(e) => setOutcomeForm({ ...outcomeForm, remaining_hours: e.target.value })} /></Field>
          <Field label="EAC (hrs)"><input type="number" className="in" value={outcomeForm.eac_hours} onChange={(e) => setOutcomeForm({ ...outcomeForm, eac_hours: e.target.value })} /></Field>
          <Field label="% Complete"><input type="number" className="in" min="0" max="100" value={outcomeForm.percent_complete} onChange={(e) => setOutcomeForm({ ...outcomeForm, percent_complete: e.target.value })} /></Field>
          <Field label="Active">
            <div className="flex items-center gap-2 text-[13px] mt-2">
              <input type="checkbox" checked={outcomeForm.is_active} onChange={(e) => setOutcomeForm({ ...outcomeForm, is_active: e.target.checked })} />
              <span>Is active</span>
            </div>
          </Field>
        </div>
      </Modal>

      <Modal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title={`${editingActivityId ? 'Edit' : 'New'} Activity`}
        subtitle="WBS-style row for the selected outcome."
        footer={(
          <>
            <button onClick={() => setActivityModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
            <button onClick={saveActivity} className="px-4 py-2 rounded-lg bg-teal text-white text-sm font-semibold">Save Activity</button>
          </>
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Outcome">
            <select className="in" value={activityForm.outcome_id} onChange={(e) => setActivityForm({ ...activityForm, outcome_id: e.target.value })}>
              <option value="">— Select —</option>
              {outcomes.map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.outcome_code} - {outcome.title}</option>)}
            </select>
          </Field>
          <Field label="Effort Version">
            <select className="in" value={activityForm.effort_version} onChange={(e) => setActivityForm({ ...activityForm, effort_version: e.target.value })}>
              <option>Original</option>
              <option>Revised</option>
            </select>
          </Field>
          <Field label="Activity" full><input className="in" value={activityForm.activity} onChange={(e) => setActivityForm({ ...activityForm, activity: e.target.value })} /></Field>
          <Field label="Application"><input className="in" value={activityForm.application} onChange={(e) => setActivityForm({ ...activityForm, application: e.target.value })} /></Field>
          <Field label="Assignee"><input className="in" value={activityForm.assignee} onChange={(e) => setActivityForm({ ...activityForm, assignee: e.target.value })} /></Field>
          <Field label="Workstream"><input className="in" value={activityForm.workstream} onChange={(e) => setActivityForm({ ...activityForm, workstream: e.target.value })} /></Field>
          <Field label="Estimated Effort"><input type="number" className="in" value={activityForm.estimated_effort_hours} onChange={(e) => setActivityForm({ ...activityForm, estimated_effort_hours: e.target.value })} /></Field>
          <Field label="Actuals"><input type="number" className="in" value={activityForm.actuals_hours} onChange={(e) => setActivityForm({ ...activityForm, actuals_hours: e.target.value })} /></Field>
          <Field label="Status">
            <select className="in" value={activityForm.status} onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value })}>
              {ACTIVITY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Work Days"><input type="number" className="in" value={activityForm.work_days} onChange={(e) => setActivityForm({ ...activityForm, work_days: e.target.value })} /></Field>
          <Field label="Planned Start"><input type="date" className="in" value={activityForm.planned_start || ''} onChange={(e) => setActivityForm({ ...activityForm, planned_start: e.target.value })} /></Field>
          <Field label="Forecast End"><input type="date" className="in" value={activityForm.forecast_end || ''} onChange={(e) => setActivityForm({ ...activityForm, forecast_end: e.target.value })} /></Field>
          <Field label="Completion Date"><input type="date" className="in" value={activityForm.completion_date || ''} onChange={(e) => setActivityForm({ ...activityForm, completion_date: e.target.value })} /></Field>
          <Field label="Proj Start"><input type="date" className="in" value={activityForm.proj_start || ''} onChange={(e) => setActivityForm({ ...activityForm, proj_start: e.target.value })} /></Field>
          <Field label="Cumulative Hrs"><input type="number" className="in" value={activityForm.cum_hours} onChange={(e) => setActivityForm({ ...activityForm, cum_hours: e.target.value })} /></Field>
        </div>
      </Modal>

      <style>{`
        .in {
          width:100%;
          padding:.5rem .6rem;
          border-radius:.45rem;
          font-size:.83rem;
          border:1px solid #E3E7EE;
        }
        .excel-grid {
          border-collapse: collapse;
          width: 100%;
        }
        .excel-grid th {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          font-weight: 600;
          color: #475569;
          padding: 8px 12px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }
        .excel-grid td {
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          font-size: 12.5px;
          white-space: nowrap;
          color: #334155;
        }
        .excel-grid tr:hover {
          background-color: #f8fafc;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children, full }) {
  return <div className={full ? 'col-span-2' : ''}><label className="block text-[12px] text-slate-500 mb-1 font-medium">{label}</label>{children}</div>;
}